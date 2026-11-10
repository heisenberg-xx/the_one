import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Shimeji from "@/components/shimeji/Shimeji";
import type { CharacterName } from "@/components/shimeji/config/characters";

/** Desktop pet shown on the site — change to "heisenberg" | "rajesh" | "spiderman". */
const SHIMEJI_CHARACTER: CharacterName = "rajesh";

export const metadata: Metadata = {
  title: "rajesh ande",
  description: "a developer who builds, breaks, and rebuilds better.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-light antialiased overflow-x-hidden min-h-screen">
        <NavBar />
        {children}
        <Shimeji character={SHIMEJI_CHARACTER} respectReducedMotion={false} />
      </body>
    </html>
  );
}
