import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

function getAllowedDevOrigins() {
  if (isProduction) {
    return [];
  }

  const configuredUrls = [
    process.env.FITMATE_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  return Array.from(
    new Set(
      configuredUrls.flatMap((configuredUrl) => {
        if (!configuredUrl?.trim()) {
          return [];
        }

        try {
          const url = new URL(configuredUrl.trim());
          return url.protocol === "http:" || url.protocol === "https:"
            ? [url.hostname]
            : [];
        } catch {
          return [];
        }
      })
    )
  );
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=(self), screen-wake-lock=(self), payment=(self), usb=(), browsing-topics=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Allow the configured ngrok/preview hostname to load Next.js dev assets.
  // Without this, the page renders but client-side login/register handlers do
  // not hydrate when accessed through a tunnel.
  allowedDevOrigins: getAllowedDevOrigins(),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
