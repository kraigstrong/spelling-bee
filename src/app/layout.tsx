import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spelling Quest · Little words, big adventures",
  description:
    "Turn your spelling list into a story adventure. Read, fill in letters, and spell your way to the finish.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
