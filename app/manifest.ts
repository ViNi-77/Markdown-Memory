import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Markdown Memory",
    short_name: "MD Memory",
    description:
      "AIが生成したMarkdownを保存し、どの端末からでも見返し・編集・共有できるツール。",
    lang: "ja",
    dir: "auto",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#f8f7f4",
    theme_color: "#2d3b56",
    orientation: "any",
    categories: ["productivity", "utilities"],
    prefer_related_applications: false,
    launch_handler: {
      client_mode: "navigate-existing",
    },
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "ワークスペースを開く",
        short_name: "Workspace",
        description: "ログイン済みのMarkdownワークスペースを開きます。",
        url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "デモを開く",
        short_name: "Demo",
        description: "未ログインで操作感を確認できるデモを開きます。",
        url: "/demo",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
