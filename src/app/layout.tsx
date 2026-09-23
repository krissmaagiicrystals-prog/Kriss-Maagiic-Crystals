import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Cormorant_Garamond, Raleway } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import { Suspense } from "react";
import ScrollToHash from "@/components/ScrollToHash";

// Cinzel — ancient/mystical Roman engraving feel, perfect for crystal/astrology
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--nf-heading",
});

// Cinzel Decorative — ornate display font for hero titles & section headers
const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--nf-display",
});

// Cormorant Garamond — elegant spiritual serif, kept for sub-headings
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--nf-sub",
});

// Raleway — refined geometric sans, softer & more intentional than Inter
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--nf-body",
});

export const metadata: Metadata = {
  // Canonical host for every URL-based metadata field. The site serves on www and
  // 308-redirects the bare domain, so relative canonicals (e.g. on product pages)
  // must resolve against www or Google sees two addresses for the same page.
  metadataBase: new URL("https://www.krissmaagiiccrystals.com"),
  alternates: { canonical: "/" },
  title: {
    default: "KrissMaagiic Crystals | Authentic Healing Crystals & Spiritual Services",
    template: "%s | KrissMaagiic Crystals"
  },
  description: "Authentic, energised & intuitively selected premium crystals. Book personalised tarot readings, custom spells, and numerology charts with Kriss in Hyderabad.",
  keywords: ["KrissMaagiic Crystals", "Healing Crystals", "Tarot Reading", "Spell Casting", "Numerology", "Crystal Bracelets", "Hyderabad Crystals"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/site-logo.png", type: "image/png", sizes: "192x192" }
    ],
    apple: "/site-logo.png",
  },
  openGraph: {
    title: "KrissMaagiic Crystals | Authentic Healing Crystals & Spiritual Services",
    description: "Authentic, energised & intuitively selected premium crystals and spiritual services.",
    url: "https://www.krissmaagiiccrystals.com",
    siteName: "KrissMaagiic Crystals",
    locale: "en_IN",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17664610156"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'AW-17664610156');
            `
          }}
        />

        {/* Preconnect to CDNs for faster asset resolution */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />

        {/* Bootstrap 5 CSS */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
        {/* Font Awesome 6 Icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

        {/* Google Site Name Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Kriss Maagiic Crystals",
              "alternateName": ["Kriss Maagiic", "Kriss Maagiic Crystals", "KrissMaagiic"],
              "url": "https://www.krissmaagiiccrystals.com"
            })
          }}
        />
      </head>
      <body className={`${cinzel.variable} ${cinzelDecorative.variable} ${cormorant.variable} ${raleway.variable}`} suppressHydrationWarning>
        <div id="page-wrapper">
          <Suspense fallback={null}>
            <ScrollToHash />
          </Suspense>
          <Shell>{children}</Shell>
        </div>
      </body>
    </html>
  );
}
