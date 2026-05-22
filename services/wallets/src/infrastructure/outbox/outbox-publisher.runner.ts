import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { OutboxPublisherService } from "../../application/services/outbox-publisher.service";

@Injectable()
export class OutboxPublisherRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherRunner.name);
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly outboxPublisherService: OutboxPublisherService,
  ) {}

  onModuleInit(): void {
    this.logger.log("Starting Wallet outbox publisher runner.");

    this.interval = setInterval(() => {
      void this.runOnce();
    }, 1000);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async runOnce(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      await this.outboxPublisherService.publishPendingEvents();
    } catch (error) {
      this.logger.error(
        error instanceof Error
          ? error.message
          : "Unexpected Wallet outbox publisher error.",
      );
    } finally {
      this.isRunning = false;
    }
  }
}
