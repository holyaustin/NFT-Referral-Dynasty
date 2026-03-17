'use client';

import { useState, useEffect } from 'react';
import { LeaderboardTable } from '@/components/Leaderboard/LeaderboardTable';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { TabNavigation } from '@/components/UI/TabNavigation';
import { TrophyIcon, UserGroupIcon, FireIcon } from '@heroicons/react/24/outline';
import { useWallet } from '@/hooks/useWallet';

const timeframes = [
  { id: 'all', name: 'All Time' },
  { id: 'month', name: 'This Month' },
  { id: 'week', name: 'This Week' },
  { id: 'day', name: 'Today' },
];

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState('all');
  const { leaders, isLoading, error, totalParticipants } = useLeaderboard(timeframe);
  const { isConnected } = useWallet();

  const stats = [
    {
      title: 'Total Participants',
      value: totalParticipants,
      icon: UserGroupIcon,
      color: 'blue' as const,
    },
    {
      title: 'Top Referrer',
      value: leaders[0] ? `${leaders[0].address.slice(0, 6)}...${leaders[0].address.slice(-4)}` : 'N/A',
      icon: TrophyIcon,
      color: 'yellow' as const,
    },
    {
      title: 'Total Referrals',
      value: leaders.reduce((sum, l) => sum + l.referrals, 0),
      icon: FireIcon,
      color: 'orange' as const,
    },
  ];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold gradient-text">Error Loading Leaderboard</h2>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
          {!isConnected && (
            <p className="text-sm text-gray-500">Please connect your wallet to view leaderboard</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Leaderboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Top referrers in the Referral Dynasty ecosystem
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const colors = {
              blue: 'from-blue-500 to-blue-600',
              yellow: 'from-yellow-500 to-yellow-600',
              orange: 'from-orange-500 to-orange-600',
            };
            
            return (
              <div key={i} className="glass-card p-6 relative overflow-hidden group">
                <div className={`absolute inset-0 bg-gradient-to-r ${colors[stat.color]} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative">
                  <Icon className={`h-8 w-8 text-${stat.color}-500 mb-3`} />
                  <p className="text-sm text-gray-600 dark:text-gray-300">{stat.title}</p>
                  <p className="text-2xl font-bold gradient-text mt-1">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeframe Tabs */}
        <div className="mb-6">
          <TabNavigation tabs={timeframes} activeTab={timeframe} onTabChange={setTimeframe} />
        </div>

        {/* Leaderboard Table */}
        <LeaderboardTable leaders={leaders} isLoading={isLoading} />

        {/* Join CTA */}
        {isConnected && (
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Not on the leaderboard yet? Start referring to climb the ranks!
            </p>
            <a
              href="/register"
              className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
            >
              Start Referring
            </a>
          </div>
        )}
      </div>
    </div>
  );
}