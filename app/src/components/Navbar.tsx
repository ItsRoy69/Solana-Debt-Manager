'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white">
              💰 Debt Manager
            </h1>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/deposit" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Deposit
                </Link>
                <Link href="/borrow" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Borrow
                </Link>
                <Link href="/liquidate" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Liquidate
                </Link>
                <Link href="/admin" className="text-yellow-400 hover:text-yellow-300 px-3 py-2 rounded-md text-sm font-medium">
                  Admin
                </Link>
              </div>
            </div>
          </div>
          <div>
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
          </div>
        </div>
      </div>
    </nav>
  );
}
