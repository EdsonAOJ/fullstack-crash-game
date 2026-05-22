import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {
  BetRealtimePayload,
  GameRealtimeNotifier,
  RoundRealtimePayload,
} from "../../application/ports/game-realtime.notifier";

@WebSocketGateway({
  namespace: "/games",
  cors: {
    origin: "*",
  },
})
export class GameEventsGateway
  implements GameRealtimeNotifier, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  handleConnection(client: Socket): void {
    console.log(`Game websocket client connected: ${client.id}`);

    client.emit("connection.ready", {
      namespace: "/games",
      connectedAt: new Date().toISOString(),
    });
  }
  handleDisconnect(client: Socket): void {
    console.log(`Game websocket client disconnected: ${client.id}`);
  }

  notifyRoundCreated(payload: RoundRealtimePayload): void {
    this.emit("round.created", payload);
  }

  notifyRoundStarted(payload: RoundRealtimePayload): void {
    this.emit("round.started", payload);
  }

  notifyRoundMultiplierUpdated(payload: RoundRealtimePayload): void {
    this.emit("round.multiplier.updated", payload);
  }

  notifyRoundCrashed(payload: RoundRealtimePayload): void {
    this.emit("round.crashed", payload);
  }

  notifyRoundCompleted(payload: RoundRealtimePayload): void {
    this.emit("round.completed", payload);
  }

  notifyBetPlaced(payload: BetRealtimePayload): void {
    this.emit("bet.placed", payload);
  }

  notifyBetAccepted(payload: BetRealtimePayload): void {
    this.emit("bet.accepted", payload);
  }

  notifyBetRejected(payload: BetRealtimePayload): void {
    this.emit("bet.rejected", payload);
  }

  notifyBetCashedOut(payload: BetRealtimePayload): void {
    this.emit("bet.cashed_out", payload);
  }

  private emit(eventName: string, payload: unknown): void {
    if (!this.server) {
      return;
    }

    this.server.emit(eventName, payload);
  }
}
