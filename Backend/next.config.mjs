import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  turbopack: {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  },
  transpilePackages: ["@toantrung/database"],
};

export default nextConfig;
