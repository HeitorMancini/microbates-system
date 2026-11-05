import type { Metadata } from "next";
import type { ReactNode } from "react";
import "98.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MicroSystem",
  description:
    "Portfólio em forma de área de trabalho inspirada no Windows 98.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
