import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

const thai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "คีย์เลข",
  description: "คีย์รายการเลขให้ไวขึ้น พร้อมสรุปยอดอัตโนมัติ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${thai.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
