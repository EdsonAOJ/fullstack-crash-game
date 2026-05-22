import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CashoutBetUseCase } from "../../application/use-cases/cashout-bet.use-case";
import { GetBetByIdUseCase } from "../../application/use-cases/get-bet-by-id.use-case";
import { GetCurrentRoundUseCase } from "../../application/use-cases/get-current-round.use-case";
import { GetLatestRoundUseCase } from "../../application/use-cases/get-latest-round.use-case";
import { GetMyCurrentBetUseCase } from "../../application/use-cases/get-my-current-bet.use-case";
import { GetRoundVerifyUseCase } from "../../application/use-cases/get-round-verify.use-case";
import { GetRoundsHistoryUseCase } from "../../application/use-cases/get-rounds-history.use-case";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import type { AuthenticatedRequest } from "../../infrastructure/auth/authenticated-request";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";

import { ZodValidationPipe } from "../../infrastructure/http/zod-validation.pipe";
import {
  placeBetBodySchema,
  type PlaceBetBodyDto,
} from "../dtos/place-bet.dto";
import {
  getRoundsHistoryQuerySchema,
  type GetRoundsHistoryQueryDto,
} from "../dtos/get-rounds-history-query.dto";

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  ApiErrorResponseDto,
  BetEnvelopeResponseDto,
  HealthEnvelopeResponseDto,
  PlaceBetRequestDto,
  RoundEnvelopeResponseDto,
  RoundsHistoryEnvelopeResponseDto,
  RoundVerifyEnvelopeResponseDto,
} from "../dtos/swagger/game-response.dto";
import { HealthService } from "@/infrastructure/health/health.service";
import { GetLeaderboardUseCase } from "../../application/use-cases/get-leaderboard.use-case";
import {
  getLeaderboardQuerySchema,
  type GetLeaderboardQueryDto,
} from "../dtos/get-leaderboard-query.dto";

@Controller()
export class GamesController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutBetUseCase: CashoutBetUseCase,
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getMyCurrentBetUseCase: GetMyCurrentBetUseCase,
    private readonly getLatestRoundUseCase: GetLatestRoundUseCase,
    private readonly getRoundsHistoryUseCase: GetRoundsHistoryUseCase,
    private readonly getRoundVerifyUseCase: GetRoundVerifyUseCase,
    private readonly getBetByIdUseCase: GetBetByIdUseCase,
    private readonly healthService: HealthService,
    private readonly getLeaderboardUseCase: GetLeaderboardUseCase,
  ) {}

  @ApiOperation({
    summary: "Check Games service health",
  })
  @ApiOkResponse({
    type: HealthEnvelopeResponseDto,
  })
  @Get("health")
  async healthServicehealth() {
    return this.healthService.check();
  }

  @ApiOperation({
    summary: "Place a bet in the current round",
  })
  @ApiBearerAuth("keycloak-jwt")
  @ApiOkResponse({
    type: BetEnvelopeResponseDto,
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
  })
  @ApiBody({
    type: PlaceBetRequestDto,
  })
  @Post("bet")
  @UseGuards(JwtAuthGuard)
  async placeBet(
    @Body(new ZodValidationPipe(placeBetBodySchema)) body: PlaceBetBodyDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    betId: string;
    roundId: string;
    playerId: string;
    amountCents: string;
    status: string;
    autoCashoutMultiplier?: number;
  }> {
    return this.placeBetUseCase.execute({
      playerId: request.user.playerId,
      amountCents: BigInt(body.amountCents),
      autoCashoutMultiplier: body.autoCashoutMultiplier,
    });
  }

  @ApiOperation({
    summary: "Cash out the authenticated player's current accepted bet",
  })
  @ApiBearerAuth("keycloak-jwt")
  @ApiOkResponse({
    type: BetEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
  })
  @Post("bet/cashout")
  @UseGuards(JwtAuthGuard)
  async cashoutBet(@Req() request: AuthenticatedRequest): Promise<{
    betId: string;
    roundId: string;
    playerId: string;
    status: string;
    cashoutMultiplier: number;
    payoutCents: string;
  }> {
    return this.cashoutBetUseCase.execute({
      playerId: request.user.playerId,
    });
  }

  @ApiOperation({
    summary: "Get the authenticated player's current bet",
  })
  @ApiBearerAuth("keycloak-jwt")
  @ApiOkResponse({
    type: BetEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
  })
  @Get("bets/me")
  @UseGuards(JwtAuthGuard)
  async getMyCurrentBet(@Req() request: AuthenticatedRequest): Promise<{
    betId: string;
    roundId: string;
    playerId: string;
    amountCents: string;
    status: string;
    cashoutMultiplier?: number;
    payoutCents?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.getMyCurrentBetUseCase.execute({
      playerId: request.user.playerId,
    });
  }

  @ApiOperation({
    summary: "Get a specific bet by id",
  })
  @ApiBearerAuth("keycloak-jwt")
  @ApiOkResponse({
    type: BetEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
  })
  @Get("bets/:betId")
  @UseGuards(JwtAuthGuard)
  async getBetById(
    @Param("betId") betId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    betId: string;
    roundId: string;
    playerId: string;
    amountCents: string;
    status: string;
    cashoutMultiplier?: number;
    payoutCents?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.getBetByIdUseCase.execute({
      betId,
      playerId: request.user.playerId,
    });
  }

  @ApiOperation({
    summary: "Get the current round",
  })
  @ApiOkResponse({
    type: RoundEnvelopeResponseDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
  })
  @Get("rounds/current")
  async getCurrentRound(): Promise<{
    id: string;
    status: string;
    crashPoint?: number;
    currentMultiplier: number;
    startsAt: string;
    startedAt?: string;
    crashedAt?: string;
    completedAt?: string;
    serverSeedHash?: string;
    bets: Array<{
      id: string;
      playerId: string;
      amountCents: string;
      status: string;
      cashoutMultiplier?: number;
      payoutCents?: string;
      rejectionReason?: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return this.getCurrentRoundUseCase.execute();
  }

  @ApiOperation({
    summary: "Get the latest finished round",
  })
  @ApiOkResponse({
    type: RoundEnvelopeResponseDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
  })
  @Get("rounds/latest")
  async getLatestRound(): Promise<{
    id: string;
    status: string;
    crashPoint: number;
    currentMultiplier: number;
    startsAt: string;
    startedAt?: string;
    crashedAt?: string;
    completedAt?: string;
    bets: Array<{
      id: string;
      playerId: string;
      amountCents: string;
      status: string;
      cashoutMultiplier?: number;
      payoutCents?: string;
      rejectionReason?: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return this.getLatestRoundUseCase.execute();
  }

  @ApiOperation({
    summary: "Get finished rounds history",
  })
  @ApiOkResponse({
    type: RoundsHistoryEnvelopeResponseDto,
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
  })
  @Get("rounds/history")
  async getRoundsHistory(
    @Query(new ZodValidationPipe(getRoundsHistoryQuerySchema))
    query: GetRoundsHistoryQueryDto,
  ): Promise<{
    items: Array<{
      id: string;
      status: string;
      crashPoint: number;
      currentMultiplier: number;
      startsAt: string;
      startedAt?: string;
      crashedAt?: string;
      completedAt?: string;
      betsCount: number;
      cashedOutBetsCount: number;
      lostBetsCount: number;
    }>;
  }> {
    return this.getRoundsHistoryUseCase.execute({
      limit: query.limit,
    });
  }

  @ApiOperation({
    summary: "Verify provably fair data for a round",
  })
  @ApiOkResponse({
    type: RoundVerifyEnvelopeResponseDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
  })
  @Get("rounds/:roundId/verify")
  async verifyRound(@Param("roundId") roundId: string): Promise<{
    roundId: string;
    status: string;
    algorithm: "HMAC_SHA256";
    serverSeed?: string;
    serverSeedHash: string;
    publicSeed: string;
    nonce: number;
    crashPoint?: number;
    crashPointMultiplier?: number;
    calculatedCrashPoint?: number;
    calculatedCrashPointMultiplier?: number;
    isHashValid?: boolean;
    isCrashPointValid?: boolean;
    isRevealed: boolean;
  }> {
    return this.getRoundVerifyUseCase.execute({
      roundId,
    });
  }

  @ApiOperation({
    summary: "Get players leaderboard",
  })
  @ApiOkResponse({
    description: "Leaderboard successfully returned.",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
  })
  @Get("leaderboard")
  async getLeaderboard(
    @Query(new ZodValidationPipe(getLeaderboardQuerySchema))
    query: GetLeaderboardQueryDto,
  ): Promise<{
    items: Array<{
      playerId: string;
      betsCount: number;
      cashoutsCount: number;
      lostBetsCount: number;
      totalWageredCents: string;
      totalPayoutCents: string;
      totalProfitCents: string;
    }>;
  }> {
    return this.getLeaderboardUseCase.execute({
      limit: query.limit,
    });
  }
}
