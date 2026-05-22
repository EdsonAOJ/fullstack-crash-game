import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiValidationDetailDto {
  @ApiProperty({
    example: "amountCents",
  })
  path!: string;

  @ApiProperty({
    example: "amountCents must be a positive integer string.",
  })
  message!: string;
}

export class ApiErrorBodyDto {
  @ApiProperty({
    example: "VALIDATION_ERROR",
  })
  code!: string;

  @ApiProperty({
    example: "Request validation failed.",
  })
  message!: string;

  @ApiProperty({
    example: 400,
  })
  statusCode!: number;

  @ApiPropertyOptional({
    type: [ApiValidationDetailDto],
    example: [
      {
        path: "amountCents",
        message: "amountCents must be a positive integer string.",
      },
    ],
  })
  details?: ApiValidationDetailDto[];
}

export class ApiErrorResponseDto {
  @ApiProperty({
    example: false,
  })
  success!: false;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  timestamp!: string;

  @ApiProperty({
    example: "9dff1b6f-bb1d-4c8a-8ee9-42de3c4d312c",
  })
  requestId!: string;

  @ApiProperty({
    type: ApiErrorBodyDto,
  })
  error!: ApiErrorBodyDto;
}

export class PlaceBetRequestDto {
  @ApiProperty({
    example: "1000",
    description: "Bet amount in cents. Must be a positive integer string.",
  })
  amountCents!: string;
}

export class HealthResponseDto {
  @ApiProperty({
    example: "ok",
  })
  status!: string;

  @ApiProperty({
    example: "games",
  })
  service!: string;
}

export class HealthEnvelopeResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  timestamp!: string;

  @ApiProperty({
    example: "9dff1b6f-bb1d-4c8a-8ee9-42de3c4d312c",
  })
  requestId!: string;

  @ApiProperty({
    type: HealthResponseDto,
  })
  data!: HealthResponseDto;

  @ApiProperty({
    example: null,
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;
}

export class BetResponseDto {
  @ApiProperty({
    example: "7b21d174-ed77-474b-bd74-fb1167c50584",
  })
  betId!: string;

  @ApiProperty({
    example: "d6021946-57b3-4833-aaf7-07e2b9dfb6b4",
  })
  roundId!: string;

  @ApiProperty({
    example: "player",
  })
  playerId!: string;

  @ApiProperty({
    example: "1000",
  })
  amountCents!: string;

  @ApiProperty({
    example: "PENDING_DEBIT",
  })
  status!: string;

  @ApiPropertyOptional({
    example: 1.5,
  })
  cashoutMultiplier?: number;

  @ApiPropertyOptional({
    example: "1500",
  })
  payoutCents?: string;

  @ApiPropertyOptional({
    example: "INSUFFICIENT_BALANCE",
  })
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:00.000Z",
  })
  createdAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:01.000Z",
  })
  updatedAt?: string;
}

export class BetEnvelopeResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  timestamp!: string;

  @ApiProperty({
    example: "9dff1b6f-bb1d-4c8a-8ee9-42de3c4d312c",
  })
  requestId!: string;

  @ApiProperty({
    type: BetResponseDto,
  })
  data!: BetResponseDto;

  @ApiProperty({
    example: null,
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;
}

export class RoundBetDto {
  @ApiProperty({
    example: "7b21d174-ed77-474b-bd74-fb1167c50584",
  })
  id!: string;

  @ApiProperty({
    example: "player",
  })
  playerId!: string;

  @ApiProperty({
    example: "1000",
  })
  amountCents!: string;

  @ApiProperty({
    example: "ACCEPTED",
  })
  status!: string;

  @ApiPropertyOptional({
    example: 1.5,
  })
  cashoutMultiplier?: number;

  @ApiPropertyOptional({
    example: "1500",
  })
  payoutCents?: string;

  @ApiPropertyOptional({
    example: "INSUFFICIENT_BALANCE",
  })
  rejectionReason?: string;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  createdAt!: string;

  @ApiProperty({
    example: "2026-05-21T23:00:01.000Z",
  })
  updatedAt!: string;
}

export class RoundResponseDto {
  @ApiProperty({
    example: "d6021946-57b3-4833-aaf7-07e2b9dfb6b4",
  })
  id!: string;

  @ApiProperty({
    example: "RUNNING",
  })
  status!: string;

  @ApiProperty({
    example: 2.35,
  })
  crashPoint!: number;

  @ApiProperty({
    example: 1.42,
  })
  currentMultiplier!: number;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  startsAt!: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:10.000Z",
  })
  startedAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:20.000Z",
  })
  crashedAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:23.000Z",
  })
  completedAt?: string;

  @ApiProperty({
    type: [RoundBetDto],
  })
  bets!: RoundBetDto[];
}

export class RoundEnvelopeResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  timestamp!: string;

  @ApiProperty({
    example: "9dff1b6f-bb1d-4c8a-8ee9-42de3c4d312c",
  })
  requestId!: string;

  @ApiProperty({
    type: RoundResponseDto,
  })
  data!: RoundResponseDto;

  @ApiProperty({
    example: null,
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;
}

export class RoundHistoryItemDto {
  @ApiProperty({
    example: "d6021946-57b3-4833-aaf7-07e2b9dfb6b4",
  })
  id!: string;

  @ApiProperty({
    example: "COMPLETED",
  })
  status!: string;

  @ApiProperty({
    example: 2.35,
  })
  crashPoint!: number;

  @ApiProperty({
    example: 2.35,
  })
  currentMultiplier!: number;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  startsAt!: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:10.000Z",
  })
  startedAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:20.000Z",
  })
  crashedAt?: string;

  @ApiPropertyOptional({
    example: "2026-05-21T23:00:23.000Z",
  })
  completedAt?: string;

  @ApiProperty({
    example: 10,
  })
  betsCount!: number;

  @ApiProperty({
    example: 3,
  })
  cashedOutBetsCount!: number;

  @ApiProperty({
    example: 7,
  })
  lostBetsCount!: number;
}

export class RoundsHistoryResponseDto {
  @ApiProperty({
    type: [RoundHistoryItemDto],
  })
  items!: RoundHistoryItemDto[];
}

export class RoundsHistoryEnvelopeResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  timestamp!: string;

  @ApiProperty({
    example: "9dff1b6f-bb1d-4c8a-8ee9-42de3c4d312c",
  })
  requestId!: string;

  @ApiProperty({
    type: RoundsHistoryResponseDto,
  })
  data!: RoundsHistoryResponseDto;

  @ApiProperty({
    example: null,
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;
}

export class RoundVerifyResponseDto {
  @ApiProperty({
    example: "d6021946-57b3-4833-aaf7-07e2b9dfb6b4",
  })
  roundId!: string;

  @ApiProperty({
    example: "HMAC_SHA256",
  })
  algorithm!: "HMAC_SHA256";

  @ApiProperty({
    example: "9d759d0f-9d52-4d01-bf8f-32eb65fa0704",
  })
  serverSeed!: string;

  @ApiProperty({
    example: "985f9e2f40b0c9c81d5d4b5f5e4cbddecd8c6fcfa8e20f6a603ad8d8d8e1f8a1",
  })
  serverSeedHash!: string;

  @ApiProperty({
    example: "crash-game",
  })
  publicSeed!: string;

  @ApiProperty({
    example: 123,
  })
  nonce!: number;

  @ApiProperty({
    example: 2.35,
  })
  crashPoint!: number;

  @ApiProperty({
    example: 235,
  })
  crashPointMultiplier!: number;

  @ApiProperty({
    example: 2.35,
  })
  calculatedCrashPoint!: number;

  @ApiProperty({
    example: 235,
  })
  calculatedCrashPointMultiplier!: number;

  @ApiProperty({
    example: true,
  })
  isHashValid!: boolean;

  @ApiProperty({
    example: true,
  })
  isCrashPointValid!: boolean;
}

export class RoundVerifyEnvelopeResponseDto {
  @ApiProperty({
    example: true,
  })
  success!: true;

  @ApiProperty({
    example: "2026-05-21T23:00:00.000Z",
  })
  timestamp!: string;

  @ApiProperty({
    example: "9dff1b6f-bb1d-4c8a-8ee9-42de3c4d312c",
  })
  requestId!: string;

  @ApiProperty({
    type: RoundVerifyResponseDto,
  })
  data!: RoundVerifyResponseDto;

  @ApiPropertyOptional({
    example: 2,
    description: "Optional multiplier target for automatic cashout.",
  })
  autoCashoutMultiplier?: number;

  @ApiProperty({
    example: null,
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;
}
