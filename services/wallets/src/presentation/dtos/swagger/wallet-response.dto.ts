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
    example: "UNAUTHORIZED",
  })
  code!: string;

  @ApiProperty({
    example: "Authorization header is missing.",
  })
  message!: string;

  @ApiProperty({
    example: 401,
  })
  statusCode!: number;

  @ApiPropertyOptional({
    type: [ApiValidationDetailDto],
    example: [
      {
        path: "playerId",
        message: "playerId is required.",
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

export class HealthResponseDto {
  @ApiProperty({
    example: "ok",
  })
  status!: string;

  @ApiProperty({
    example: "wallets",
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

export class WalletResponseDto {
  @ApiProperty({
    example: "f895c015-2bb6-419f-8f92-7527d2681551",
  })
  id!: string;

  @ApiProperty({
    example: "player",
  })
  playerId!: string;

  @ApiProperty({
    example: "100000",
    description: "Wallet balance in cents.",
  })
  balanceCents!: string;
}

export class WalletEnvelopeResponseDto {
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
    type: WalletResponseDto,
  })
  data!: WalletResponseDto;

  @ApiProperty({
    example: null,
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;
}
