import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as csurf from 'csurf';
import * as rateLimit from 'express-rate-limit';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const apiDescription = `IMAGEN API Google Drive backup`;

  //Enable swagger documentation for this API
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IMAGEN-GALLERY-API')
    .setDescription(apiDescription)
    .setVersion('1.0')
    .build();

  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, doc);

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);

  app.use(helmet());
  app.use(csurf());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );
}
bootstrap();