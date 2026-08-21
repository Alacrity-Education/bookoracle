import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a minimal server plus only the traced
  // node_modules, so the runtime image needs no npm install.
  output: "standalone",

  // A type error should fail the build rather than ship a broken deploy.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
