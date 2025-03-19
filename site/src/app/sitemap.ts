import type { MetadataRoute } from "next";
import { config } from "@/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  return [
    {
      url: config.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
