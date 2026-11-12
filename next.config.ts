import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/article/why-more-young-nigerians-are-choosing-a-simpler-lifestyle-in-2026-eb2b06",
        destination: "/article/lifestyle/why-more-young-nigerians-are-choosing-a-simpler-lifestyle-in-2026-eb2b06",
        permanent: true,
      },
      {
        source: "/article/iwobi-at-100-the-eagle-who-chose-nigeria-and-never-looked-back-a6aabc",
        destination: "/article/sports/iwobi-at-100-the-eagle-who-chose-nigeria-and-never-looked-back-a6aabc",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
