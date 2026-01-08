import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  LoginDto,
  AuthResponseDto,
  JwtPayload,
  SelectOrganizationDto,
} from './dto/auth.dto';

type UserWithOrganizations = Prisma.UserGetPayload<{
  include: {
    organizations: {
      include: {
        organization: {
          select: {
            id: true;
            name: true;
            isActive: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email (globally unique)
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organizations: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Filter only active organizations
    const activeOrgs = user.organizations.filter(
      uo => uo.organization.isActive
    );

    // Allow login even for users without organizations (they will be redirected to select-organization)
    // if (activeOrgs.length === 0 && !user.isSystemAdmin) {
    //   throw new UnauthorizedException(
    //     'Usuário sem organização ativa. Aguarde associação por um administrador.'
    //   );
    // }

    // System admin can access all organizations
    const availableOrganizations = await this.getAvailableOrganizations(user);

    // Auto-select if user has exactly one organization
    let currentOrganization = undefined;
    let organizationId = undefined;
    let role = undefined;

    if (activeOrgs.length === 1) {
      const selectedOrg = activeOrgs[0];
      currentOrganization = {
        id: selectedOrg.organization.id,
        name: selectedOrg.organization.name,
        role: selectedOrg.role,
      };
      organizationId = selectedOrg.organization.id;
      role = selectedOrg.role;
    }

    const tokens = await this.generateTokens(
      user,
      organizationId,
      role,
      user.isSystemAdmin
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSystemAdmin: user.isSystemAdmin,
        currentOrganization,
        availableOrganizations,
      },
    };
  }

  async selectOrganization(
    userId: string,
    dto: SelectOrganizationDto
  ): Promise<AuthResponseDto> {
    const { organizationId } = dto;

    // Find user with organizations
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // System admin can select any organization
    if (user.isSystemAdmin) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, isActive: true },
      });

      if (!organization) {
        throw new UnauthorizedException('Organização não encontrada');
      }

      if (!organization.isActive) {
        throw new UnauthorizedException('Organização inativa');
      }

      // Get all organizations for system admin
      const availableOrganizations = await this.getAvailableOrganizations(user);

      const currentOrganization = {
        id: organization.id,
        name: organization.name,
        role: 'OWNER', // System admin acts as OWNER in any org
      };

      const tokens = await this.generateTokens(
        user,
        organizationId,
        'OWNER',
        user.isSystemAdmin
      );

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isSystemAdmin: user.isSystemAdmin,
          currentOrganization,
          availableOrganizations,
        },
      };
    }

    // Regular users: Find the selected organization in their associations
    const selectedOrgAssoc = user.organizations.find(
      uo => uo.organization.id === organizationId && uo.organization.isActive
    );

    if (!selectedOrgAssoc) {
      throw new UnauthorizedException(
        'Organização não disponível para o usuário'
      );
    }

    // Build available organizations list
    const availableOrganizations = await this.getAvailableOrganizations(user);

    const currentOrganization = {
      id: selectedOrgAssoc.organization.id,
      name: selectedOrgAssoc.organization.name,
      role: selectedOrgAssoc.role,
    };

    const tokens = await this.generateTokens(
      user,
      organizationId,
      selectedOrgAssoc.role,
      user.isSystemAdmin
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSystemAdmin: user.isSystemAdmin,
        currentOrganization,
        availableOrganizations,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(
      refreshToken,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }
    );

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organizations: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido');
    }

    // Build available organizations list
    const availableOrganizations = await this.getAvailableOrganizations(user);

    // Restore organization from token (if any)
    let currentOrganization = undefined;
    let role = undefined;

    if (payload.organizationId) {
      const orgAssoc = user.organizations.find(
        uo => uo.organization.id === payload.organizationId
      );
      if (orgAssoc && orgAssoc.organization.isActive) {
        currentOrganization = {
          id: orgAssoc.organization.id,
          name: orgAssoc.organization.name,
          role: orgAssoc.role,
        };
        role = orgAssoc.role;
      }
    }

    const tokens = await this.generateTokens(
      user,
      payload.organizationId,
      role,
      user.isSystemAdmin
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSystemAdmin: user.isSystemAdmin,
        currentOrganization,
        availableOrganizations,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const availableOrganizations = await this.getAvailableOrganizations(user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: user.isSystemAdmin,
      availableOrganizations,
    };
  }

  private async getAvailableOrganizations(user: UserWithOrganizations) {
    if (user.isSystemAdmin) {
      const allOrgs = await this.prisma.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return allOrgs.map(org => ({
        id: org.id,
        name: org.name,
        role: 'OWNER',
      }));
    }

    return user.organizations
      .filter(uo => uo.organization.isActive)
      .map(uo => ({
        id: uo.organization.id,
        name: uo.organization.name,
        role: uo.role,
      }));
  }

  private async generateTokens(
    user: UserWithOrganizations,
    organizationId?: string,
    role?: string,
    isSystemAdmin = false
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId,
      role,
      isSystemAdmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d'
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
