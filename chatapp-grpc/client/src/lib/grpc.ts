import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.join(process.cwd(), '..', 'proto', 'chat', 'chat.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(process.cwd(), '..', 'proto')],
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat as any;

const GRPC_HOST = process.env.GRPC_HOST || 'localhost:50051';

// Create service clients
export const authClient = new chatProto.AuthService(
  GRPC_HOST,
  grpc.credentials.createInsecure()
);

export const roomClient = new chatProto.RoomService(
  GRPC_HOST,
  grpc.credentials.createInsecure()
);

export const chatClient = new chatProto.ChatService(
  GRPC_HOST,
  grpc.credentials.createInsecure()
);

export const fileClient = new chatProto.FileService(
  GRPC_HOST,
  grpc.credentials.createInsecure()
);

export const notificationClient = new chatProto.NotificationService(
  GRPC_HOST,
  grpc.credentials.createInsecure()
);

// Helper to promisify unary gRPC calls
export function unaryCall<TReq, TRes>(
  client: any,
  method: string,
  request: TReq,
  metadata?: grpc.Metadata
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    const meta = metadata || new grpc.Metadata();
    client[method](request, meta, (err: grpc.ServiceError | null, response: TRes) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}
