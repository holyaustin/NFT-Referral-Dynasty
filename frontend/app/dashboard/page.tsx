'use client';

import { useWallet } from '@/hooks/useWallet';
import { useBadgeData } from '@/hooks/useBadgeData';
import { useReferralEvents } from '@/hooks/useReferralEvents';
import { BadgeCard } from '@/components/Badge/BadgeCard';
import { ReferralStats } from '@/components/Referral/ReferralStats';
import { ReferralForm } from '@/components/Referral/ReferralForm';
import { ReferralTree } from '@/components/Referral/ReferralTree';
import { StatCard } from '@/components/UI/StatCard';
import { TabNavigation } from '@/components/UI/TabNavigation';
import { NetworkStatus } from '@/components/UI/NetworkStatus';
import { useState } from 'react';
import { ArrowPathIcon, UserGroupIcon, TrophyIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const tabs = [
  { id: 'overview', name: 'Overview' },
  { id: 'referrals', name: 'Referral Tree' },
  { id: 'rewards', name: 'Rewards History' },
];

export default function DashboardPage() {
  const { address, isConnected, connect } = useWallet();
  const { badge, isLoading, refetch } = useBadgeData(address);
  const { events, totalReferrals, totalRewards } = useReferralEvents(address);
  const [activeTab, setActiveTab] = useState('overview');

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold gradient-text">Connect Wallet to View Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300">Access your referral stats and badge evolution</p>
          <button
            onClick={connect}
            className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Ensure address is defined before rendering components that require it
  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Loading wallet address...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Your Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Track your referral progress and badge evolution
            </p>
          </div>
          <NetworkStatus />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Badge Tier"
            value={badge ? ['Bronze', 'Silver', 'Gold', 'Platinum'][badge.tier] : 'No Badge'}
            icon={<TrophyIcon className="h-6 w-6" />}
            color="purple"
            isLoading={isLoading}
          />
          <StatCard
            title="Referrals"
            value={totalReferrals}
            icon={<UserGroupIcon className="h-6 w-6" />}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Rewards"
            value={`${totalRewards} STT`}
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Next Tier"
            value={badge ? `${Math.max(0, 5 - badge.referralCount)} more` : 'Mint Badge'}
            icon={<ArrowPathIcon className="h-6 w-6" />}
            color="orange"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Badge */}
          <div className="lg:col-span-1">
            {/* Now address is guaranteed to be a string */}
            <BadgeCard badge={badge} address={address} onUpdate={refetch} />
            
            {/* Quick Actions */}
            <div className="mt-6 glass-card p-6">
              <h3 className="text-lg font-semibold gradient-text mb-4">Quick Actions</h3>
              <ReferralForm address={address} onSuccess={refetch} />
            </div>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            
            <div className="mt-6 glass-card p-6">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <ReferralStats address={address} events={events} />
                </div>
              )}
              
              {activeTab === 'referrals' && (
                <ReferralTree address={address} />
              )}
              
              {activeTab === 'rewards' && (
                <div className="space-y-4">
                  {events.map((event, i) => (
                    <div key={i} className="border-b border-purple-500/20 pb-4 last:border-0">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {event.type === 'referral' ? '🎉 New referral!' : '💰 Reward received'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}