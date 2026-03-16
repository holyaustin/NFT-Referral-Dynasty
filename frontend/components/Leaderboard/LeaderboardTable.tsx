'use client';

import { LeaderboardRow } from './LeaderboardRow';
import { BadgeSkeleton } from '../Badge/BadgeSkeleton';
import { motion } from 'framer-motion';

interface LeaderboardTableProps {
  leaders: Array<{
    rank: number;
    address: string;
    referrals: number;
    tier: number;
    badgeImage?: string;
  }>;
  isLoading: boolean;
}

export function LeaderboardTable({ leaders, isLoading }: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <BadgeSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              <th className="px-6 py-4 text-left text-sm font-semibold gradient-text">Rank</th>
              <th className="px-6 py-4 text-left text-sm font-semibold gradient-text">Referrer</th>
              <th className="px-6 py-4 text-right text-sm font-semibold gradient-text">Referrals</th>
              <th className="px-6 py-4 text-right text-sm font-semibold gradient-text">Badge Tier</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((leader, index) => (
              <motion.tr
                key={leader.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors"
              >
                <LeaderboardRow leader={leader} />
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {leaders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-300">No leaders found</p>
        </div>
      )}
    </div>
  );
}