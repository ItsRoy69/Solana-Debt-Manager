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
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-primary/50 transition-shadow">
          {symbol.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold group-hover:text-primary transition-colors">{symbol}</p>
          <p className="text-gray-500 text-xs font-mono">{mint.slice(0, 4)}...{mint.slice(-4)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-semibold font-mono tracking-tight">{balance.toLocaleString()}</p>
        <p className="text-gray-400 text-sm">${valueUSD.toFixed(2)}</p>
        {apy !== undefined && (
          <p className="text-green-400 text-xs font-medium bg-green-400/10 px-2 py-0.5 rounded-full inline-block mt-1">
            {apy.toFixed(2)}% APY
          </p>
        )}
      </div>
    </div>
  );
}
