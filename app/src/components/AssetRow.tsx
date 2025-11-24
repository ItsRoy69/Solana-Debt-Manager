'use client';

interface AssetRowProps {
  mint: string;
  symbol: string;
  balance: number;
  valueUSD: number;
  apy?: number;
}

export default function AssetRow({ mint, symbol, balance, valueUSD, apy }: AssetRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
          {symbol.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold">{symbol}</p>
          <p className="text-gray-400 text-xs">{mint.slice(0, 8)}...</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-semibold">{balance.toLocaleString()}</p>
        <p className="text-gray-400 text-sm">${valueUSD.toFixed(2)}</p>
        {apy !== undefined && (
          <p className="text-green-400 text-xs">{apy.toFixed(2)}% APY</p>
        )}
      </div>
    </div>
  );
}
