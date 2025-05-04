import "./globals.css";

export const metadata = {
  title: "Free Online Games | Play Instantly",
  description:
    "Enjoy a collection of high-quality online games. Play free games with no downloads or signup required.",
  keywords: "online games, free games, play games, browser games, instant play",
  authors: [{ name: "YourBrandName", url: "https://yourdomain.com" }],
  openGraph: {
    title: "Free Online Games | Play Instantly",
    description:
      "A massive collection of fun, fast, and free online games to play right now.",
    url: "https://yourdomain.com",
    siteName: "FreeGamesOnline",
    images: [
      {
        url: "/og-image.jpg", // Replace with actual Open Graph image
        width: 1200,
        height: 630,
        alt: "Free Online Games",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Games | Play Instantly",
    description:
      "Fun online games you can play right in your browser. No downloads!",
    site: "@yourtwitterhandle",
    creator: "@yourtwitterhandle",
    images: ["/og-image.jpg"]
  },
  metadataBase: new URL("https://yourdomain.com"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
