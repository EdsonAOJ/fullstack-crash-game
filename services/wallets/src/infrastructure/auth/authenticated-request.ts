import type { AuthenticatedUser } from "./authenticated-user";

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
