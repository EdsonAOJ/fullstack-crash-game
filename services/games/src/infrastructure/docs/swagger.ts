import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Crash Game - Games Service")
    .setDescription(
      "HTTP API for Crash Game rounds, bets, cashout, realtime gameplay state, and provably fair verification.",
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
    .addTag("Bets")
    .addTag("Rounds")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
