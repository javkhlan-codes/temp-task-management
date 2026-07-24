import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:8000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pro Team — Таск менежмент",
    template: "%s | Pro Team",
  },
  description:
    "Баг, төсөл, даалгавраа нэг дор төлөвлөж, хуваарилж, хамтран удирдах Pro Team workspace.",
  applicationName: "Pro Team",
  icons: {
    icon: "/pro-team-logo.png",
    apple: "/pro-team-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "mn_MN",
    siteName: "Pro Team",
    title: "Pro Team — Таск менежмент",
    description:
      "Багийн ажлыг нэг хэмнэлд оруулах төсөл, таск менежментийн нэгдсэн орон зай.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pro Team — Таск менежмент",
    description:
      "Багийн ажлыг нэг хэмнэлд оруулах төсөл, таск менежментийн нэгдсэн орон зай.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
