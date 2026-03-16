'use client';

import { useState, useEffect } from 'react';
import { LeaderboardRow } from './LeaderboardRow';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/hooks/useWallet';

interface LeaderboardEntry {
  rank: number;
  address: string;
  referralCount: number;
  tier: number;
  totalRewards: string;
  badgeImage?: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  timeframe?: 'daily' | 'weekly' | 'allTime';
  onTimeframeChange?: (timeframe: string) => void;
}

export function LeaderboardTable({ entries, timeframe = 'allTime', onTimeframeChange }: LeaderboardTableProps) {
  const { address } = useWallet();
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      setHighlightedAddress(address);
      // Scroll to user's row
      const element = document.getElementById(`rank-${address}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [address, entries]);

  const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum'];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header with timeframe selector */}
      <div className="p-6 border-b border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <span className="text-3xl">🏆</span>
            Top Referrers
          </h2>
          
          <div className="flex gap-2">
            {['daily', 'weekly', 'allTime'].map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-purple-500/10 text-gray-600 dark:text-gray-300 hover:bg-purple-500/20'
                }`}
              >
                {tf === 'daily' ? 'Today' : tf === 'weekly' ? 'This Week' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-500/5">
              <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Referrer</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Badge</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Referrals</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Tier</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Rewards</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {entries.map((entry, index) => (
                <LeaderboardRow
                  key={entry.address}
                  entry={entry}
                  isCurrentUser={entry.address.toLowerCase() === address?.toLowerCase()}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Live updates indicator */}
      <div className="p-4 border-t border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Leaderboard updates in real-time
        </div>
      </div>
    </div>
  );
}