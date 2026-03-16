'use client';

import { useState } from 'react';
import { LeaderboardTable } from '@/components/Leaderboard/LeaderboardTable';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { TabNavigation } from '@/components/UI/TabNavigation';
import { TrophyIcon, UserGroupIcon, FireIcon } from '@heroicons/react/24/outline';

const timeframes = [
  { id: 'all', name: 'All Time' },
  { id: 'month', name: 'This Month' },
  { id: 'week', name: 'This Week' },
  { id: 'day', name: 'Today' },
];

// Define a type for the color keys
type ColorKey = 'blue' | 'yellow' | 'orange';

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState('all');
  const { leaders, isLoading, totalParticipants } = useLeaderboard(timeframe);

  // Type the stats array with proper color typing
  const stats: {
    title: string;
    value: string | number;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: ColorKey;
  }[] = [
    {
      title: 'Total Participants',
      value: totalParticipants,
      icon: UserGroupIcon,
      color: 'blue',
    },
    {
      title: 'Top Referrer',
      value: leaders[0]?.address?.slice(0, 6) + '...' + leaders[0]?.address?.slice(-4) || 'N/A',
      icon: TrophyIcon,
      color: 'yellow',
    },
    {
      title: 'Total Referrals',
      value: leaders.reduce((sum, l) => sum + l.referrals, 0),
      icon: FireIcon,
      color: 'orange',
    },
  ];

  // Define colors with proper typing
  const colors: Record<ColorKey, string> = {
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600',
    orange: 'from-orange-500 to-orange-600',
  };

  // Define text color classes
  const textColors: Record<ColorKey, string> = {
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    orange: 'text-orange-500',
  };

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
            
            return (
              <div key={i} className="glass-card p-6 relative overflow-hidden group">
                <div className={`absolute inset-0 bg-gradient-to-r ${colors[stat.color]} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative">
                  <Icon className={`h-8 w-8 ${textColors[stat.color]} mb-3`} />
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
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Not on the leaderboard yet? Start referring to climb the ranks!
          </p>
          <button className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50">
            Start Referring
          </button>
        </div>
      </div>
    </div>
  );
}