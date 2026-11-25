import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "localhost";

const config: NextConfig = {
  transpilePackages: ["@michimi/core"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default config;
