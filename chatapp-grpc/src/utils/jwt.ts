import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
  username: string;
}

export function generateToken(payload: TokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "2h" });
}

export function validateToken(token: string, secret: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return { userId: decoded.userId, username: decoded.username };
  } catch {
    return null;
  }
}
