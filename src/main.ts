import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import compression = require('compression'); 



async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());    

  app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
app.use(compression());

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
