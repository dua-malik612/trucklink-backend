import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Process level handlers to catch hidden silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('--- UNHANDLED REJECTION CRASH ---');
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('--- UNCAUGHT EXCEPTION CRASH ---');
  console.error('Error:', error);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enabled verbose logger to display all internal framework events
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          issue: Object.values(e.constraints ?? {}).join(', '),
        }));
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          details,
        });
      },
    }),
  );

  // app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();