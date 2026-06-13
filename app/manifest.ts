import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Markdown Memory",
    short_name: "MD Memory",
    description:
      "AIが生成したMarkdownを保存し、どの端末からでも見返し・編集・共有できるツール。",
    start_url: "/demo",
    scope: "/",
    display: "standalone",
    background_color: "#f8f7f4",
    theme_color: "#2d3b56",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
