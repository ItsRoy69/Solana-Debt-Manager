'use client';

interface HealthRatioProps {
  ratio: number;
}

export default function HealthRatio({ ratio }: HealthRatioProps) {
  const getColor = () => {
    if (ratio >= 1.5) return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
    if (ratio >= 1.2) return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]';
    return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  };

  const getTextColor = () => {
    if (ratio >= 1.5) return 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]';
    if (ratio >= 1.2) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]';
    return 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  };

  const percentage = Math.min((ratio / 2) * 100, 100);

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">Health Ratio</h3>
      <div className="flex items-end justify-between mb-4">
        <span className={`text-5xl font-bold font-mono ${getTextColor()}`}>
          {ratio.toFixed(2)}
        </span>
        <span className="text-gray-400 text-sm mb-2 font-medium bg-white/5 px-3 py-1 rounded-full border border-white/10">
          {ratio >= 1.5 ? 'Healthy' : ratio >= 1.2 ? 'Moderate' : 'At Risk'}
        </span>
      </div>
      
      <div className="relative w-full h-4 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
        <div
          className={`h-full ${getColor()} transition-all duration-500 ease-out relative`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 blur-[2px]"></div>
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
        <span>0.0</span>
        <span>1.0</span>
        <span>2.0+</span>
      </div>

      <p className="text-gray-400 text-xs mt-4 flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/5">
        <span className="text-lg">ℹ️</span>
        {ratio < 1.0 ? 'Position can be liquidated immediately.' : 'Keep ratio above 1.2 to avoid liquidation risks.'}
      </p>
    </div>
  );
}
