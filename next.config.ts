import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {'/dashboard/**':['./service-runtime/index.html']},
};

export default nextConfig;
