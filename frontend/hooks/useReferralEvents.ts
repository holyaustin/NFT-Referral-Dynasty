'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI, REFERRAL_DYNASTY_ABI } from '@/lib/contract';

interface ReferralEvent {
  type: 'referral' | 'reward';
  message: string;
  timestamp: number;
  amount?: number;
  txHash?: string;
}

export function useReferralEvents(address: string | undefined) {
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!address || !window.ethereum) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Get badge contract
        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );

        // Get dynasty contract for events
        const dynastyContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralDynasty,
          REFERRAL_DYNASTY_ABI,
          provider
        );

        console.log('Connected to network:', await provider.getNetwork());
        console.log('Badge contract address:', CONTRACT_ADDRESSES.referralBadge);
        console.log('Dynasty contract address:', CONTRACT_ADDRESSES.referralDynasty);

        // Check if user has a badge
        const hasBadge = await badgeContract.hasBadge(address);
        console.log('hasBadge result:', hasBadge);

        if (hasBadge) {
          // Get referral count from badge contract (not from dynasty)
          const badgeData = await badgeContract.getUserBadge(address);
          console.log('Badge data:', badgeData);
          
          // badgeData is a tuple: [tier, referralCount, lastUpdate]
          // In ethers v6, it's an array-like object
          const referralCount = Number(badgeData[1] || badgeData.referralCount);
          setTotalReferrals(referralCount);

          // For rewards total, we need to query events
          // This is a simplified version - in production you'd want to use an indexer
          const filter = dynastyContract.filters.RewardDistributed?.(address);
          if (filter) {
            const rewardEvents = await dynastyContract.queryFilter(filter, -10000); // Last 10000 blocks
            const total = rewardEvents.reduce((sum, event: any) => {
              return sum + Number(ethers.formatEther(event.args?.[1] || 0));
            }, 0);
            setTotalRewards(total);

            // Convert to event format for display
            const formattedEvents: ReferralEvent[] = rewardEvents.map((event: any) => ({
              type: 'reward',
              message: `Received ${ethers.formatEther(event.args?.[1] || 0)} STT reward`,
              timestamp: (event as any).timestamp || Date.now(),
              amount: Number(ethers.formatEther(event.args?.[1] || 0)),
              txHash: event.transactionHash,
            }));
            setEvents(formattedEvents);
          }
        } else {
          setTotalReferrals(0);
          setTotalRewards(0);
          setEvents([]);
        }
      } catch (err: any) {
        console.error('Error fetching events:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [address]);

  return { events, isLoading, error, totalReferrals, totalRewards };
}