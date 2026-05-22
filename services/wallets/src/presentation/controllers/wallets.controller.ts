import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { GetWalletByPlayerUseCase } from "../../application/use-cases/get-wallet-by-player.use-case";
import type { AuthenticatedRequest } from "../../infrastructure/auth/authenticated-request";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";
import {
  ApiErrorResponseDto,
  HealthEnvelopeResponseDto,
  WalletEnvelopeResponseDto,
} from "../dtos/swagger/wallet-response.dto";
import { HealthService } from "../../infrastructure/health/health.service";

@ApiTags("Wallets")
@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletByPlayerUseCase: GetWalletByPlayerUseCase,
    private readonly healthService: HealthService,
  ) {}

  @Get("health")
  @ApiOperation({
    summary: "Check Wallets service health",
  })
  @ApiOkResponse({
    type: HealthEnvelopeResponseDto,
  })
  async health() {
    return this.healthService.check();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create wallet for authenticated player",
  })
  @ApiBearerAuth("keycloak-jwt")
  @ApiOkResponse({
    type: WalletEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
  })
  async createWallet(@Req() request: AuthenticatedRequest): Promise<{
    id: string;
    playerId: string;
    balanceCents: string;
  }> {
    return this.createWalletUseCase.execute({
      playerId: request.user.playerId,
    });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get authenticated player's wallet",
  })
  @ApiBearerAuth("keycloak-jwt")
  @ApiOkResponse({
    type: WalletEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
  })
  async getMyWallet(@Req() request: AuthenticatedRequest): Promise<{
    id: string;
    playerId: string;
    balanceCents: string;
  }> {
    return this.getWalletByPlayerUseCase.execute({
      playerId: request.user.playerId,
    });
  }
}
