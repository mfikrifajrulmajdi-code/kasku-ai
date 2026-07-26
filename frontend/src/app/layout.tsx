import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KasKu AI — SaaS Control Panel",
  description: "SaaS Multi-Tenant Control Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0f0c29] text-slate-50 selection:bg-violet-500/30">
        {children}
      </body>
    </html>
  );
}
