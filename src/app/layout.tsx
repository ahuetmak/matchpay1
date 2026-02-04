import type { Metadata } from "next";
import { site } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  title: { default: site.name, template: `%s — ${site.name}` },
  description: site.desc,
  alternates: { canonical: site.baseUrl },
  openGraph: { type: "website", url: site.baseUrl, siteName: site.name, title: site.name, description: site.desc },
  twitter: { card: "summary_large_image" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" }}>
        {children}
      </body>
    </html>
  );
}
