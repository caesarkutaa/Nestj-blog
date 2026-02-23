import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import * as express from 'express';

// ✅ Load environment variables FIRST
dotenv.config();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    // ✅✅✅ FIXED: Use express.json instead of bodyParser ✅✅✅
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.use(compression());

    // ✅ Add cookie parser BEFORE other middleware
    app.use(cookieParser());

    // ✅ Security headers
    app.use(helmet());

    // ✅ Enable CORS with credentials support
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://www.krevv.com',
        'https://krevv.vercel.app',
       'http://localhost:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['Set-Cookie'],
    });

    // ✅ Global validation
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

    // ✅ Use environment port
    const PORT = process.env.PORT || 8000;
    
    await app.listen(PORT);  
    
    console.log('========================================');
    console.log(`🚀 Server successfully started`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`📝 Body parser limit: 50MB`); // ✅ Added confirmation
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.MONGO_URI ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🔗 Access: http://localhost:${PORT}`);
     console.log(`🔌 WebSocket available at: ws://localhost:${PORT}/marketplace-chat`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();

// ✅ Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// ✅ Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// ✅ Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

// ✅ Handle SIGINT gracefully (Ctrl+C)
process.on('SIGINT', () => {
  console.log('⚠️  SIGINT signal received: closing HTTP server');
  process.exit(0);
});