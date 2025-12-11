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
        organization: true;
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

    // Filter only active organizations
    const activeOrgs = user.organizations.filter(
      uo => uo.organization.isActive
    );

    // Block non-admin users without organizations
    if (activeOrgs.length === 0 && !user.isSystemAdmin) {
      throw new UnauthorizedException(
        'Usuário sem organização ativa. Aguarde associação por um administrador.'
      );
    }

    // Build available organizations list
    const availableOrganizations = activeOrgs.map(uo => ({
      id: uo.organization.id,
      name: uo.organization.name,
      role: uo.role,
    }));

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

    // Find the selected organization
    const selectedOrgAssoc = user.organizations.find(
      uo => uo.organization.id === organizationId && uo.organization.isActive
    );

    if (!selectedOrgAssoc) {
      throw new UnauthorizedException(
        'Organização não disponível para o usuário'
      );
    }

    // Build available organizations list
    const availableOrganizations = user.organizations
      .filter(uo => uo.organization.isActive)
      .map(uo => ({
        id: uo.organization.id,
        name: uo.organization.name,
        role: uo.role,
      }));

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
    const availableOrganizations = user.organizations
      .filter(uo => uo.organization.isActive)
      .map(uo => ({
        id: uo.organization.id,
        name: uo.organization.name,
        role: uo.role,
      }));

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

    const availableOrganizations = user.organizations.map(uo => ({
      id: uo.organization.id,
      name: uo.organization.name,
      role: uo.role,
    }));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: user.isSystemAdmin,
      availableOrganizations,
    };
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
