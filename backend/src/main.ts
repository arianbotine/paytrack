import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { PerformanceInterceptor } from './shared/interceptors/performance.interceptor';
import { TimeoutMiddleware } from './shared/middleware/timeout.middleware';
import { logInfo, logError } from './shared/utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  // Enable graceful shutdown hooks for Prisma
  app.enableShutdownHooks();

  // Body size limits (before other middleware)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Timeout middleware
  app.use(new TimeoutMiddleware().use.bind(new TimeoutMiddleware()));

  // Cookie parser middleware
  app.use(cookieParser());

  // Global performance interceptor
  app.useGlobalInterceptors(new PerformanceInterceptor());

  // Enable CORS with environment variables
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  logInfo('CORS configured', 'Bootstrap', { allowedOrigins });

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'idempotency-key',
      'X-Silent-Request',
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

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

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PayTrack API')
    .setDescription('API para sistema de contas a pagar e receber')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  logInfo(`PayTrack API running on port ${port}`, 'Bootstrap');
  logInfo(`Swagger docs available at /api/docs`, 'Bootstrap');
}

bootstrap().catch(err => {
  logError('Failed to start application', err, 'Bootstrap');
  process.exit(1);
});
