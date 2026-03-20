'use client';

import Link from 'next/link';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { BadgeEvolution } from './BadgeEvolution';

interface BadgeCardProps {
  badge: {
    tier: number;
    referralCount: number;
    lastUpdate: number;
  } | null;
  address: string;
  tokenId?: number;  // ADDED: For search by tokenId
  isPublic?: boolean;
  onUpdate?: () => void;
}

const tierColors = [
  'from-amber-700 to-amber-500', // Bronze
  'from-gray-400 to-gray-300',   // Silver
  'from-yellow-400 to-yellow-300', // Gold
  'from-purple-400 to-purple-300', // Platinum
];

const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export function BadgeCard({ badge, address, tokenId, isPublic = false, onUpdate }: BadgeCardProps) {
  if (!badge) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-lg font-semibold gradient-text mb-2">No Badge Yet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {isPublic ? 'This user hasn\'t minted a badge yet' : 'Mint your genesis badge to start'}
        </p>
        {!isPublic && (
          <Link
            href="/register"
            className="inline-block rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300"
          >
            Mint Badge
          </Link>
        )}
      </div>
    );
  }

  const tierColor = tierColors[badge.tier] || tierColors[0];
  
  // FIXED: Use actual tier thresholds from contract (2,5,20)
  const nextTier = badge.tier < 3 ? getNextTierThreshold(badge.tier) : null;
  const progress = nextTier ? (badge.referralCount / nextTier) * 100 : 100;

  // Helper function to get next tier threshold
  function getNextTierThreshold(currentTier: number): number {
    const thresholds = [2, 5, 20]; // Silver:2, Gold:5, Platinum:20
    return thresholds[currentTier] || 0;
  }

  return (
    <Link href={`/profile/${address}`}>
      <div className="glass-card p-6 relative overflow-hidden group cursor-pointer transition-transform hover:scale-105">
        {/* Background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tierColor} opacity-0 group-hover:opacity-10 transition-opacity`} />
        
        <div className="relative">
          {/* ADDED: Token ID Badge for search visibility */}
          {tokenId && (
            <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
              #{tokenId}
            </div>
          )}

          {/* Badge Image */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <BadgeEvolution tier={badge.tier} size="lg" />
          </div>

          {/* Badge Info */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold gradient-text">{tierNames[badge.tier]}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Level {badge.tier + 1} · {badge.referralCount} Referrals
            </p>
            {/* ADDED: Show truncated address for search visibility */}
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress to {tierNames[badge.tier + 1]}</span>
                <span>{badge.referralCount}/{nextTier}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Last Update */}
          <p className="text-xs text-gray-500 text-center">
            Last evolved: {new Date(badge.lastUpdate * 1000).toLocaleDateString()}
          </p>

          {/* Actions */}
          {!isPublic && onUpdate && (
            <button
              onClick={(e) => {
                e.preventDefault();  // Prevent Link navigation
                onUpdate();
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}