import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthenticatedUser } from "./authenticated-user";

interface JwtPayload {
  sub?: string;
  preferred_username?: string;
  email?: string;
  azp?: string;
  aud?: string | string[];
}

interface HttpRequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer = process.env.KEYCLOAK_ISSUER;
  private readonly jwksUrl = process.env.KEYCLOAK_JWKS_URL;
  private readonly audience = process.env.KEYCLOAK_AUDIENCE;
  private readonly authDisabled = process.env.AUTH_DISABLED === "true";

  private readonly jwks =
    this.jwksUrl !== undefined
      ? createRemoteJWKSet(new URL(this.jwksUrl))
      : null;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpRequestWithUser>();

    if (this.authDisabled) {
      const fallbackPlayerId =
        this.getHeaderAsString(request, "x-player-id") ?? "player";

      request.user = {
        playerId: fallbackPlayerId,
        username: fallbackPlayerId,
        subject: fallbackPlayerId,
      };

      return true;
    }

    if (!this.issuer || !this.audience || !this.jwks) {
      throw new UnauthorizedException("Authentication is not configured.");
    }

    const token = this.extractBearerToken(request);

    let payload: unknown;

    try {
      const verificationResult = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      });

      payload = verificationResult.payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token.");
    }

    const parsedPayload = payload as JwtPayload;

    this.validateAudienceOrClient(parsedPayload);

    const subject = parsedPayload.sub;

    if (!subject) {
      throw new UnauthorizedException("JWT subject is missing.");
    }

    const username = parsedPayload.preferred_username ?? parsedPayload.email;
    const playerId = username ?? subject;

    request.user = {
      playerId,
      username,
      subject,
    };

    return true;
  }

  private extractBearerToken(request: HttpRequestWithUser): string {
    const authorization = this.getHeaderAsString(request, "authorization");

    if (!authorization) {
      throw new UnauthorizedException("Authorization header is missing.");
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid Authorization header.");
    }

    return token;
  }

  private validateAudienceOrClient(payload: JwtPayload): void {
    const audience = payload.aud;

    const hasAudience = Array.isArray(audience)
      ? audience.includes(this.audience ?? "")
      : audience === this.audience;

    const hasAuthorizedParty = payload.azp === this.audience;

    if (!hasAudience && !hasAuthorizedParty) {
      throw new UnauthorizedException("Invalid token audience.");
    }
  }

  private getHeaderAsString(
    request: HttpRequestWithUser,
    headerName: string,
  ): string | undefined {
    const value = request.headers[headerName];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
