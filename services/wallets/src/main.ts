import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupSwagger } from "./infrastructure/docs/swagger";
import { GlobalExceptionFilter } from "./infrastructure/http/global-exception.filter";
import { ResponseEnvelopeInterceptor } from "./infrastructure/http/response-envelope.interceptor";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  setupSwagger(app);

  const port = Number(process.env.PORT ?? 4002);

  await app.listen(port, "0.0.0.0");

  console.log(`Wallets service running on port ${port}`);
}

bootstrap();
