'use client';

import { Inter } from "next/font/google";
import "../styles/globals.css";
import WalletContextProvider from "@/contexts/WalletContextProvider";
import { AnchorContextProvider } from "@/contexts/AnchorContextProvider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 min-h-screen`} suppressHydrationWarning>
        <WalletContextProvider>
          <AnchorContextProvider>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </AnchorContextProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
