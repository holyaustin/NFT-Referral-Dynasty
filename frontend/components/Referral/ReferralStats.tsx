'use client';

import { useReferralEvents } from '@/hooks/useReferralEvents';
import { ArrowTrendingUpIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface ReferralStatsProps {
  address: string;
  isPublic?: boolean;
}

export function ReferralStats({ address, isPublic = false }: ReferralStatsProps) {
  const { events, isLoading, error, totalReferrals, totalRewards } = useReferralEvents(address);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-purple-500/20 rounded-lg" />
        <div className="h-40 bg-purple-500/20 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        <p>Error loading stats: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <UserGroupIcon className="h-6 w-6 mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold gradient-text">{totalReferrals}</p>
          <p className="text-xs text-gray-500">Referrals</p>
        </div>
        <div className="text-center">
          <CurrencyDollarIcon className="h-6 w-6 mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold gradient-text">{totalRewards.toFixed(4)}</p>
          <p className="text-xs text-gray-500">STT Earned</p>
        </div>
        <div className="text-center">
          <ArrowTrendingUpIcon className="h-6 w-6 mx-auto text-purple-500 mb-2" />
          <p className="text-2xl font-bold gradient-text">{events.length}</p>
          <p className="text-xs text-gray-500">Events</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-sm font-semibold gradient-text mb-3">Recent Activity</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {events.slice(0, 10).map((event, i) => (
            <div
              key={i}
              className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10"
            >
              <p className="text-sm">
                {event.type === 'referral' ? '🎉' : '💰'} {event.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(event.timestamp).toLocaleString()}
              </p>
              {event.txHash && (
                <a
                  href={`https://testnet-explorer.somnia.network/tx/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-500 hover:underline mt-1 block"
                >
                  View Transaction
                </a>
              )}
            </div>
          ))}

          {events.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No activity yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}