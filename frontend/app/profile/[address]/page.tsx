'use client';

import { useParams } from 'next/navigation';
import { useBadgeData } from '@/hooks/useBadgeData';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { BadgeCard } from '@/components/Badge/BadgeCard';
import { ReferralStats } from '@/components/Referral/ReferralStats';
import { StatCard } from '@/components/UI/StatCard';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  
  const { badge, isLoading: badgeLoading } = useBadgeData(address);
  const { leaders } = useLeaderboard('all');
  
  const rank = leaders.findIndex(l => l.address.toLowerCase() === address.toLowerCase()) + 1;
  const leaderInfo = leaders.find(l => l.address.toLowerCase() === address.toLowerCase());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold gradient-text">Profile</h1>
            <Link
              href={`https://testnet-explorer.somnia.network/address/${address}`}
              target="_blank"
              className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              View on Explorer
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
            {address}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Rank"
            value={rank ? `#${rank}` : 'Unranked'}
            icon="🏆"
            color="purple"
            isLoading={badgeLoading}
          />
          <StatCard
            title="Total Referrals"
            value={leaderInfo?.referrals || 0}
            icon="👥"
            color="blue"
            isLoading={badgeLoading}
          />
          <StatCard
            title="Badge Tier"
            value={badge ? ['Bronze', 'Silver', 'Gold', 'Platinum'][badge.tier] : 'No Badge'}
            icon="✨"
            color="green"
            isLoading={badgeLoading}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Badge */}
          <div className="lg:col-span-1">
            <BadgeCard badge={badge} address={address} isPublic />
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold gradient-text mb-4">Referral Activity</h3>
              <ReferralStats address={address} isPublic />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}