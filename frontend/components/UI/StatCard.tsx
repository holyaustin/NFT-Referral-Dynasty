'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'purple' | 'blue' | 'green' | 'orange' | 'yellow';
  isLoading?: boolean;
}

const colorClasses = {
  purple: 'from-purple-500 to-purple-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  yellow: 'from-yellow-500 to-yellow-600',
};

export function StatCard({ title, value, icon, color, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-8 w-8 bg-purple-500/20 rounded-lg mb-3" />
        <div className="h-4 bg-purple-500/20 rounded w-24 mb-2" />
        <div className="h-6 bg-purple-500/20 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className="relative">
        <div className={`text-${color}-500 mb-3`}>{icon}</div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
        <p className="text-2xl font-bold gradient-text mt-1">{value}</p>
      </div>
    </div>
  );
}