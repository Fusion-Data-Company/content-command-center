import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Command Center — Marketing Strategy",
  description:
    "AI-powered content generation, SEO optimization, and multi-platform publishing by Marketing Strategy.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Content Command Center — Marketing Strategy",
    description:
      "AI-powered content generation, SEO optimization, and multi-platform publishing by Marketing Strategy.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Marketing Strategy — Content Command Center",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Content Command Center — Marketing Strategy",
    description:
      "AI-powered content generation, SEO optimization, and multi-platform publishing by Marketing Strategy.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text-secondary antialiased">
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#FFFFFF",
            },
          }}
        />
      </body>
    </html>
  );
}
