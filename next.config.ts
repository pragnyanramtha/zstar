import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * SECURITY: These mitigate the most common web attack vectors:
 * - XSS via Content-Security-Policy (restricts where scripts/styles/connections load from)
 * - Clickjacking via X-Frame-Options (no third-party iframing)
 * - MIME confusion via X-Content-Type-Options (browser won't sniff content types)
 * - Information leakage via Referrer-Policy (only origin sent cross-origin)
 * - HTTPS stripping via HSTS (forces browsers to HTTPS for 2 years)
 * - Browser feature abuse via Permissions-Policy (denies camera/mic/geo)
 *
 * CSP connect-src explicitly allows:
 * - wss://*.livekit.io  — LiveKit WebSocket for real-time coordination
 * - https://generativelanguage.googleapis.com — Gemini API
 */
const nextConfig: NextConfig = {
  // CLOUD RUN: standalone output bundles only what's needed — keeps Docker image lean
  output: "standalone",

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // SECURITY: Denies rendering in iframes — prevents clickjacking
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // SECURITY: Blocks MIME-sniffing — prevents disguised script injection
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // SECURITY: Limits referrer data — reduces URL/session info leakage
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // SECURITY: Principle of least privilege — calls go server-side via SIP,
            // so the browser doesn't need camera/microphone/geolocation access
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // SECURITY: HSTS — forces HTTPS for 2 years, prevents SSL stripping.
            // Safe on Cloud Run which always serves TLS.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // SECURITY: CSP — restricts resource loading origins.
            // 'unsafe-inline' and 'unsafe-eval' are required by Next.js RSC hydration.
            // connect-src is tightly scoped to LiveKit (WSS) + Gemini API only.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.livekit.io wss://*.livekit.io https://generativelanguage.googleapis.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
