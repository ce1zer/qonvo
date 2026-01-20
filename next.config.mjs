/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb"
    }
  },
  // Dev-only: ensure hot-update JSON can be fetched even if the browser treats it as cross-origin.
  async headers() {
    return [
      {
        source: "/_next/static/webpack/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" }
        ]
      }
    ];
  },
  // Some Next versions read this at the top-level (keep both for compatibility).
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.220:3000",
    "http://192.168.96.17:3000"
  ]
};

export default nextConfig;

