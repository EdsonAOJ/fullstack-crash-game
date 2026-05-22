import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crash Game",
  description: "Crash Game frontend for the Jungle Gaming challenge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
