import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma/prisma.service";
import { RabbitMQConnectionService } from "../messaging/rabbitmq/rabbitmq-connection.service";

export interface HealthCheckOutput {
  status: "ok" | "degraded";
  service: "wallets";
  checks: {
    database: "ok" | "down";
    rabbitmq: "ok" | "down";
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMQConnectionService,
  ) {}

  async check(): Promise<HealthCheckOutput> {
    const [database, rabbitmq] = await Promise.all([
      this.prisma.healthCheck(),
      this.rabbitMq.healthCheck(),
    ]);

    return {
      status: database === "ok" && rabbitmq === "ok" ? "ok" : "degraded",
      service: "wallets",
      checks: {
        database,
        rabbitmq,
      },
    };
  }
}
