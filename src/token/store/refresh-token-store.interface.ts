export interface RefreshTokenPayload {
  accountId: number;
  clientId?: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export const IREFRESH_TOKEN_STORE = Symbol("IREFRESH_TOKEN_STORE");

export abstract class IRefreshTokenStore {
  abstract issue(payload: RefreshTokenPayload): Promise<IssuedRefreshToken>;
  abstract verify(token: string): Promise<RefreshTokenPayload>;
  abstract revoke(token: string): Promise<void>;
  abstract revokeAll(accountId: number): Promise<void>;
}
