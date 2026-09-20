import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["@prisma/client", "nodemailer"],
};

export default nextConfig;
