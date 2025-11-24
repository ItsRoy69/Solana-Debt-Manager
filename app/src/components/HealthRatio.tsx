'use client';

interface HealthRatioProps {
  ratio: number;
}

export default function HealthRatio({ ratio }: HealthRatioProps) {
  const getColor = () => {
    if (ratio >= 1.5) return 'bg-green-500';
    if (ratio >= 1.2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (ratio >= 1.5) return 'text-green-400';
    if (ratio >= 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const percentage = Math.min((ratio / 2) * 100, 100);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Health Ratio</h3>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-3xl font-bold ${getTextColor()}`}>
          {ratio.toFixed(2)}
        </span>
        <span className="text-gray-400 text-sm">
          {ratio >= 1.5 ? 'Healthy' : ratio >= 1.2 ? 'Moderate' : 'At Risk'}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-gray-400 text-xs mt-2">
        {ratio < 1.0 ? '⚠️ Position can be liquidated' : 'Keep ratio above 1.2 to avoid liquidation'}
      </p>
    </div>
  );
}
