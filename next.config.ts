import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "f005.backblazeb2.com",
        pathname: "/file/nodes600/**",
      },
      {
        protocol: "https",
        hostname: "phwyhgzcnnjffovepbrt.supabase.co",
        pathname: "/storage/v1/object/public/file/**",
      },
    ],
  },
}

export default nextConfig
