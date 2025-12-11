import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Documentation for API Gateway')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use('/swagger/json', (req, res) => res.json(document));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`API Gateway is running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
