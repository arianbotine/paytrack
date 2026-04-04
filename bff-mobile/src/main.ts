import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('bff');

  // CORS configuration for mobile
  const corsOrigins = process.env.CORS_ORIGINS;
  const origin: (string | RegExp)[] = corsOrigins
    ? corsOrigins.split(',').map(o => o.trim())
    : [
        'http://localhost:8081', // Expo web
        'http://localhost:19006', // Expo web alt
        /^exp:\/\//, // Expo Go
        /^http:\/\/192\.168\.\d+\.\d+/, // Local network (Expo on device)
      ];

  app.enableCors({ origin, credentials: true });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PayTrack BFF Mobile')
    .setDescription(
      'BFF (Backend for Frontend) para o aplicativo móvel PayTrack.\n\n' +
        '**Como autenticar:** faça login em `POST /bff/auth/login`, copie o `accessToken` retornado e clique em **Authorize** (cadeado) inserindo apenas o token — sem o prefixo "Bearer".'
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT'
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('bff/docs', app, document);

  const port = process.env.PORT || process.env.BFF_PORT || 3001;
  await app.listen(port);

  console.log(`🚀 BFF Mobile running on http://localhost:${port}/bff`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/bff/docs`);
}
bootstrap();
