import type { MetadataRoute } from "next";
import { config } from "@/app/layout";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: config.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
