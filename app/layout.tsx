import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sairam eMoU Vault",
  description: "Centralized eMoU Sheet Management and Governance System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${gabarito.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
