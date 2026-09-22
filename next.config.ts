import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "nodemailer", "maplibre-gl", "stripe"],
};

export default nextConfig;
