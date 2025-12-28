import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import compression = require('compression');
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

dotenv.config();


async function bootstrap() {
  

  const app = await NestFactory.create(AppModule);

  // Add cookie parser BEFORE other middleware
  app.use(cookieParser());

  // Security headers
  app.use(helmet());    

  app.use(bodyParser.json({ limit: '20mb' }));
  app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
  app.use(compression());

  // Enable CORS with credentials support
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });
     
  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true })
  );

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);
  console.log(`Server listening on port ${PORT}`);
}

bootstrap();