import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    GRPC_HOST: process.env.GRPC_HOST || "localhost:50051",
  },
};

export default nextConfig;
