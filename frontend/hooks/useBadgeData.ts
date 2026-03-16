'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI } from '@/lib/contract';

interface BadgeData {
  tier: number;
  referralCount: number;
  lastUpdate: number;
}

export function useBadgeData(address: string | undefined) {
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBadge = async () => {
    if (!address || !window.ethereum) {
      setBadge(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const badgeContract = new ethers.Contract(
        CONTRACT_ADDRESSES.referralBadge,
        REFERRAL_BADGE_ABI,
        provider
      );

      const hasBadge = await badgeContract.hasBadge(address);
      
      if (hasBadge) {
        const badgeData = await badgeContract.getUserBadge(address);
        setBadge({
          tier: Number(badgeData.tier),
          referralCount: Number(badgeData.referralCount),
          lastUpdate: Number(badgeData.lastUpdate),
        });
      } else {
        setBadge(null);
      }
    } catch (err: any) {
      console.error('Error fetching badge:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBadge();
  }, [address]);

  return { badge, isLoading, error, refetch: fetchBadge };
}