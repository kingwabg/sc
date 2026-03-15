import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bomcare Suite",
  description: "Child welfare facility operations platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
