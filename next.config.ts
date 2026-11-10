import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {'/dashboard/[[...path]]':['./service-runtime/index.html']},
};

export default nextConfig;
