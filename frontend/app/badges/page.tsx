'use client';

import { useState, useEffect } from 'react';
import { BadgeGallery } from '@/components/Badge/BadgeGallery';
import { BadgeSkeleton } from '@/components/Badge/BadgeSkeleton';
import { useWallet } from '@/hooks/useWallet';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

export default function BadgesPage() {
  const { isConnected } = useWallet();
  const [badges, setBadges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Fetch all badges (you'll implement this based on your contract)
    const fetchBadges = async () => {
      setIsLoading(true);
      try {
        // TODO: Fetch badges from contract/indexer
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate loading
        setBadges([]);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, []);

  const filters = [
    { value: 'all', label: 'All Badges' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'silver', label: 'Silver' },
    { value: 'gold', label: 'Gold' },
    { value: 'platinum', label: 'Platinum' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Badge Gallery</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Explore all Referral Dynasty badges and their evolution
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by address or token ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-card border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-xl glass-card border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {filters.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gallery */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <BadgeSkeleton key={i} />
            ))}
          </div>
        ) : (
          <BadgeGallery badges={badges} filter={filter} search={search} />
        )}

        {/* Empty State */}
        {!isLoading && badges.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold gradient-text mb-2">No Badges Found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Be the first to mint a badge and start your referral journey!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}