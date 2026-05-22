import { beforeAll, describe, expect, test } from "bun:test";
import {
  KONG_URL,
  getAccessToken,
  getCurrentRound,
  getWallet,
  waitForHttpOk,
} from "./gameplay.helpers";

describe("Gameplay Smoke E2E", () => {
  beforeAll(async () => {
    await waitForHttpOk(
      "Games service to be available through Kong",
      `${KONG_URL}/games/health`,
    );

    await waitForHttpOk(
      "Wallets service to be available through Kong",
      `${KONG_URL}/wallets/health`,
    );
  });

  test("returns Games health through Kong", async () => {
    const response = await fetch(`${KONG_URL}/games/health`);

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.service).toBe("games");
    expect(body.data.checks.database).toBe("ok");
    expect(body.data.checks.rabbitmq).toBe("ok");
  });

  test("returns Wallets health through Kong", async () => {
    const response = await fetch(`${KONG_URL}/wallets/health`);

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.service).toBe("wallets");
    expect(body.data.checks.database).toBe("ok");
    expect(body.data.checks.rabbitmq).toBe("ok");
  });

  test("returns current round without exposing crash point before reveal", async () => {
    const round = await getCurrentRound();

    if (!round) {
      return;
    }

    expect(round.id).toBeTruthy();
    expect(round.status).toBeTruthy();

    if (round.status === "WAITING_FOR_BETS" || round.status === "RUNNING") {
      expect(round.serverSeedHash).toBeTruthy();
      expect(round.crashPoint).toBeUndefined();
    }
  });

  test("rejects invalid rounds history limit", async () => {
    const response = await fetch(`${KONG_URL}/games/rounds/history?limit=abc`);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      success?: boolean;
      error?: {
        code?: string;
        statusCode?: number;
      };
    };

    expect(body.success).toBe(false);
    expect(body.error?.statusCode).toBe(400);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  test("rejects protected Games endpoint without token", async () => {
    const response = await fetch(`${KONG_URL}/games/bets/me`);

    expect(response.status).toBe(401);
  });

  test("returns authenticated player wallet", async () => {
    const token = await getAccessToken();
    const wallet = await getWallet(token);

    expect(wallet.playerId).toBe("player");
    expect(BigInt(wallet.balanceCents)).toBeGreaterThanOrEqual(0n);
  });
});
