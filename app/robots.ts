import type { MetadataRoute } from "next";

const SITE_URL_RAW =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://flight-time-calculator.xkhronoz.dev";
const SITE_URL = SITE_URL_RAW.replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
