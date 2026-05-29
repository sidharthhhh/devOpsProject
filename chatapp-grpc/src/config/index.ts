export interface Config {
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  jwtSecret: string;
  grpcPort: number;
  uploadDir: string;
  maxFileSize: number;
}

export function loadConfig(): Config {
  return {
    mysqlHost: process.env.MYSQL_HOST || "localhost",
    mysqlPort: parseInt(process.env.MYSQL_PORT || "3306", 10),
    mysqlUser: process.env.MYSQL_USER || "root",
    mysqlPassword: process.env.MYSQL_PASSWORD || "",
    mysqlDatabase: process.env.MYSQL_DATABASE || "chatdb",
    jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-prod",
    grpcPort: parseInt(process.env.GRPC_PORT || "50051", 10),
    uploadDir: process.env.UPLOAD_DIR || "./uploads",
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 52428800,
  };
}
