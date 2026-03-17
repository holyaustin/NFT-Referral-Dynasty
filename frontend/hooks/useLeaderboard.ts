'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI, REFERRAL_DYNASTY_ABI } from '@/lib/contract';

interface LeaderboardEntry {
  rank: number;
  address: string;
  referrals: number;
  tier: number;
  badgeImage?: string;
}

export function useLeaderboard(timeframe: string = 'all') {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!window.ethereum) {
        setError('Please install MetaMask');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const dynastyContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralDynasty,
          REFERRAL_DYNASTY_ABI,
          provider
        );
        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );

        // Get total badges minted to know how many users to fetch
        const totalBadges = await badgeContract.totalBadges();
        
        // Fetch all badge holders
        const entries: LeaderboardEntry[] = [];
        
        for (let i = 1; i <= Number(totalBadges); i++) {
          try {
            // Get owner of token ID i
            const owner = await badgeContract.ownerOf(i);
            
            // Get badge data for this owner
            const hasBadge = await badgeContract.hasBadge(owner);
            if (!hasBadge) continue;

            const badgeData = await badgeContract.getUserBadge(owner);
            
            // Get referral count from dynasty contract
            const referralCount = await dynastyContract.getReferralCount(owner);
            
            entries.push({
              rank: 0, // Will be set after sorting
              address: owner,
              referrals: Number(referralCount),
              tier: Number(badgeData.tier),
            });
          } catch (err) {
            console.error(`Error fetching badge ${i}:`, err);
            continue;
          }
        }

        // Sort by referrals (descending) and assign ranks
        const sorted = entries
          .sort((a, b) => b.referrals - a.referrals)
          .map((entry, index) => ({
            ...entry,
            rank: index + 1,
          }))
          .slice(0, 100); // Top 100

        setLeaders(sorted);
        setTotalParticipants(sorted.length);
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe]);

  return { leaders, isLoading, error, totalParticipants };
}