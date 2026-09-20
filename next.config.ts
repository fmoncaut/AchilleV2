import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "nodemailer"],
};

export default nextConfig;
