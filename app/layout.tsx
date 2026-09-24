import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaijaToday",
  description: "Nigerian news and entertainment blog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}