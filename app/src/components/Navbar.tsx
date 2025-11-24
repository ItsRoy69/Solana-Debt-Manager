'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Navbar() {
  const pathname = usePathname();
  const pageName = pathname === '/' ? 'Dashboard' : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-[rgba(255,255,255,0.08)]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-white tracking-wide">
              {pageName}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs text-gray-300">Solana Mainnet</span>
            </div>
            <WalletMultiButton className="!bg-primary/20 hover:!bg-primary/30 !text-primary !border !border-primary/50 !rounded-xl !h-10 !px-6 !font-semibold transition-all duration-300" />
          </div>
        </div>
      </div>
    </header>
  );
}
