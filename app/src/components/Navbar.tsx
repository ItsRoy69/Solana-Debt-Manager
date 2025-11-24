'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Navbar() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const pageName = pathname === '/' ? 'Dashboard' : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2);

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {publicKey && (
            <div className="flex items-center">
              <h2 className="text-xl font-light text-white">
                {pageName}
              </h2>
            </div>
          )}
          {!publicKey && (
            <div className="flex items-center">
              <h2 className="text-xl font-light text-white">
                Solana Debt Manager
              </h2>
            </div>
          )}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-background border border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs text-secondary">Solana Devnet</span>
            </div>
            <WalletMultiButton className="!bg-primary !text-white !rounded-lg !h-10 !px-6 !font-medium hover:!bg-primary-light transition-all duration-300" />
          </div>
        </div>
      </div>
    </header>
  );
}
