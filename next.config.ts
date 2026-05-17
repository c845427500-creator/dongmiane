import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/dongmiane",
  images: { unoptimized: true },
};

export default nextConfig;
