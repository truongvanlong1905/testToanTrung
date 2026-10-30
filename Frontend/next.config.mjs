/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3002";
    if (!apiBaseUrl) {
      throw new Error("API_BASE_URL must be configured for the web application.");
    }

    return [
      { source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` },
      { source: "/uploads/:path*", destination: `${apiBaseUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
