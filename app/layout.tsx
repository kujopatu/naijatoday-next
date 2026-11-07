import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import MetaPixelTracker from "@/components/MetaPixelTracker";
import ThirdPartyScripts from "@/components/ThirdPartyScripts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SavedPostsProvider } from "@/components/SavedPostsProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/components/AuthProvider";
import AuthModals from "@/components/AuthModals";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const PIXEL_ID = "4525219914426774";

const SITE_URL = "https://naijatodayblog.com.ng";
const SITE_TITLE = "NaijaToday — Nigeria's #1 Digital Media";
const SITE_DESC =
  "NaijaToday — Nigeria's #1 news and entertainment blog. Breaking news, politics, sports, celebrity gist, jobs and scholarships.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  keywords: ["Nigeria news", "Naija news today", "Nigerian entertainment", "celebrity gist", "Nigerian politics", "Lagos news", "Abuja news", "Afrobeats", "Nollywood", "jobs in Nigeria", "scholarships for Nigerians"],
  authors: [{ name: "NaijaToday Media" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "NaijaToday",
    locale: "en_NG",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [{ url: "/og-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@NaijaTodayNG",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="meta-pixel-base" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>

        <Suspense fallback={null}>
          <MetaPixelTracker />
        </Suspense>
        <ThirdPartyScripts />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SavedPostsProvider>{children}</SavedPostsProvider>
              <AuthModals />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
