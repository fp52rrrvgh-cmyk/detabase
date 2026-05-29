import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShellWithSidebar } from "./components/AppShellWithSidebar";

export const dynamic = "force-dynamic";

const APP_NAME = "Detabase";
const APP_DESCRIPTION = "個人財務作戰系統";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: "戰情中心",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "戰情中心",
  },
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <AppShellWithSidebar>{children}</AppShellWithSidebar>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
