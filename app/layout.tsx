import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

// Inter は欧文・数字部分にだけ適用したい（日本語はシステム日本語フォントに任せる）。
// variable で `--font-inter` を発行し、`globals.css` の `--font-sans` で参照する。
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Markdown Memory",
  description:
    "AIが生成したMarkdownを保存し、どの端末からでも見返し・編集・共有できるツール。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* shadcn/ui の Sidebar コンポーネント（SidebarMenuButton の collapsed
            時 tooltip 等）が要求するためアプリ全体をラップする。 */}
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
