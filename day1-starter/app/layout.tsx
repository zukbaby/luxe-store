import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "LUXE STORE — Global Marketplace", description: "Discover products from independent sellers around the world." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
