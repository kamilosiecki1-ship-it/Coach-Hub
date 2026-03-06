import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "@react-pdf/renderer"],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set via SENTRY_ORG / SENTRY_PROJECT env vars)
  // or fill in directly here after creating a project at sentry.io
  silent: true,

  // Upload source maps only in CI/production builds
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,
});
