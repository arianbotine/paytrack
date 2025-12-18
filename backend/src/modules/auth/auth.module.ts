import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  JwtAuthGuard,
  RolesGuard,
  OrganizationGuard,
} from '../../shared/guards';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // IMPORTANTE: Guards executam na ordem de declaração
    // 1. JwtAuthGuard - valida token, seta request.user
    // 2. RolesGuard - valida roles usando request.user
    // 3. OrganizationGuard - valida organizationId no request.user
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OrganizationGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
