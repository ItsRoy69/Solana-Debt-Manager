'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 transform group-hover:scale-110">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
        <p className="text-white text-3xl font-bold mt-2 text-glow">{value}</p>
        {subtitle && <p className="text-primary/80 text-xs mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
