'use client';

import { useState, useEffect, useCallback } from 'react';
import { BadgeGallery } from '@/components/Badge/BadgeGallery';
import { BadgeSkeleton } from '@/components/Badge/BadgeSkeleton';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI } from '@/lib/contract';
import debounce from 'lodash/debounce';

// Define the badge type
interface Badge {
  tokenId: number;
  owner: string;
  badgeData: {
    tier: number;
    referralCount: number;
    lastUpdate: number;
  };
}

const BADGES_PER_PAGE = 12;

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [totalSupply, setTotalSupply] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch all badges
  useEffect(() => {
    const fetchAllBadges = async () => {
      setIsLoading(true);
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network'
        );

        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );

        const total = await badgeContract.totalBadges();
        setTotalSupply(Number(total));

        const startId = (currentPage - 1) * BADGES_PER_PAGE + 1;
        const endId = Math.min(startId + BADGES_PER_PAGE - 1, Number(total));
        
        setHasMore(endId < Number(total));

        const fetchedBadges: Badge[] = [];

        for (let tokenId = startId; tokenId <= endId; tokenId++) {
          try {
            const owner = await badgeContract.ownerOf(tokenId);
            const badgeData = await badgeContract.getBadge(tokenId);
            
            fetchedBadges.push({
              tokenId,
              owner,
              badgeData: {
                tier: Number(badgeData.tier),
                referralCount: Number(badgeData.referralCount),
                lastUpdate: Number(badgeData.lastUpdate),
              },
            });
          } catch (err) {
            console.log(`Token ${tokenId} error:`, err);
          }
        }

        if (currentPage === 1) {
          setBadges(fetchedBadges);
        } else {
          setBadges(prev => [...prev, ...fetchedBadges]);
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllBadges();
  }, [currentPage]);

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  // Debounced search handler
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearch(e.target.value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  };

  // 3 tiers only (Bronze: 0, Silver: 1, Gold: 2)
  const filters = [
    { value: 'all', label: 'All Badges' },
    { value: '0', label: 'Bronze' },
    { value: '1', label: 'Silver' },
    { value: '2', label: 'Gold' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text">Badge Gallery</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Explore all {totalSupply} Referral Dynasty badges minted so far
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by owner address or token ID..."
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-card border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={handleFilterChange}
              className="px-4 py-2 rounded-xl glass-card border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {filters.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gallery */}
        {isLoading && currentPage === 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <BadgeSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <BadgeGallery badges={badges} filter={filter} search={search} />
            
            {/* Load More Button */}
            {hasMore && !isLoading && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-medium hover:from-purple-700 hover:to-purple-900 transition-all duration-300 disabled:opacity-50"
                >
                  Load More Badges
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading indicator for pagination */}
        {isLoading && currentPage > 1 && (
          <div className="mt-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500">Loading more badges...</p>
          </div>
        )}
      </div>
    </div>
  );
}