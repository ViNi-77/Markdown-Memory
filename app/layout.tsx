import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  applicationName: "Markdown Memory",
  title: "Markdown Memory",
  description:
    "AIが生成したMarkdownを保存し、どの端末からでも見返し・編集・共有できるツール。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/maskable-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Markdown Memory",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2d3b56",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {/* shadcn/ui の Sidebar コンポーネント（SidebarMenuButton の collapsed
            時 tooltip 等）が要求するためアプリ全体をラップする。 */}
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <PwaRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
