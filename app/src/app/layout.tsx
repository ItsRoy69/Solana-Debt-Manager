'use client';

import { Inter } from "next/font/google";
import "../styles/globals.css";
import WalletContextProvider from "@/contexts/WalletContextProvider";
import { AnchorContextProvider } from "@/contexts/AnchorContextProvider";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useWallet } from '@solana/wallet-adapter-react';

const inter = Inter({ subsets: ["latin"] });

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!publicKey && pathname !== '/') {
      router.push('/');
    }
  }, [publicKey, pathname, router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className={`flex-1 ${publicKey ? 'lg:pl-64' : ''} flex flex-col min-h-screen transition-all duration-300`}>
        <Navbar />
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background min-h-screen text-foreground selection:bg-primary/30`} suppressHydrationWarning>
        <WalletContextProvider>
          <AnchorContextProvider>
            <LayoutContent>{children}</LayoutContent>
          </AnchorContextProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
