import * as grpc from "@grpc/grpc-js";
import { TokenPayload, validateToken } from "../utils/jwt";

const PUBLIC_METHODS = [
  "/chat.AuthService/Register",
  "/chat.AuthService/Login",
];

export function isPublicMethod(method: string): boolean {
  return PUBLIC_METHODS.includes(method);
}

export function extractUserFromMetadata(
  metadata: grpc.Metadata,
  jwtSecret: string
): TokenPayload | null {
  const values = metadata.get("authorization");
  if (!values || values.length === 0) {
    return null;
  }

  let token = values[0] as string;
  if (token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  return validateToken(token, jwtSecret);
}

export function requireAuth(
  call:
    | grpc.ServerUnaryCall<any, any>
    | grpc.ServerWritableStream<any, any>
    | grpc.ServerReadableStream<any, any>
    | grpc.ServerDuplexStream<any, any>,
  jwtSecret: string
): TokenPayload | null {
  return extractUserFromMetadata(call.metadata, jwtSecret);
}
