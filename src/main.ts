import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true })
  );

  // Use the port Render assigns
  const PORT = process.env.PORT || 8080;
  await app.listen(PORT);
  console.log(`Server listening on port ${PORT}`);
}

bootstrap();
