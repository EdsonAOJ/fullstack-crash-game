import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Crash Game - Wallets Service")
    .setDescription(
      "HTTP API for player wallets, balance lookup, wallet creation, and wallet-related authentication.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Keycloak access token.",
      },
      "keycloak-jwt",
    )
    .addTag("Health")
    .addTag("Wallets")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
