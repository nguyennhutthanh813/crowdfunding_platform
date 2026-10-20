import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

// Allow BigInt to be serialized to JSON
(BigInt.prototype as unknown as { toJSON: () => number | string }).toJSON = function () {
  const int = Number.parseInt(this.toString(), 10);
  return Number.isNaN(int) ? this.toString() : int;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true,
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
    }),
  );

  // Swagger API docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Crowdfunding Platform API')
    .setDescription('API documentation for the Crowdfunding Platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('campaigns', 'Campaign management')
    .addTag('pledges', 'Pledge & payment')
    .addTag('fulfillment', 'Fulfillment & tracking management')
    .addTag('social', 'Social features')
    .addTag('communication', 'Messages and notifications')
    .addTag('analytics', 'Campaign analytics and metrics')
    .addTag('admin', 'Admin panel')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // Start server
  const port = configService.get<number>('API_PORT', 3001);
  await app.listen(port);
  console.warn(`🚀 API running on http://localhost:${port}/${apiPrefix}`);
  console.warn(`📚 Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
