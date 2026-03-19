'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const getBadgeAddress = useCallback(async (provider: ethers.Provider) => {
    try {
      const dynastyContract = new ethers.Contract(
        CONTRACT_ADDRESSES.referralDynasty,
        REFERRAL_DYNASTY_ABI,
        provider
      );
      const badgeAddress = await dynastyContract.badge();
      console.log('Badge address from dynasty:', badgeAddress);
      return badgeAddress;
    } catch (err) {
      console.error('Error getting badge address:', err);
      throw new Error('Failed to get badge contract address');
    }
  }, []);

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
        
        // Get the actual badge address from dynasty contract
        const badgeAddress = await getBadgeAddress(provider);
        
        // Get badge contract with dynamic address
        const badgeContract = new ethers.Contract(
          badgeAddress,
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
        console.log('Badge contract address:', badgeAddress);
        console.log('Dynasty contract address:', CONTRACT_ADDRESSES.referralDynasty);

        // Check if user has a badge
        const hasBadge = await badgeContract.hasBadge(address);
        console.log('hasBadge result:', hasBadge);

        if (hasBadge) {
          // Get referral count from badge contract
          const badgeData = await badgeContract.getUserBadge(address);
          console.log('Badge data:', badgeData);
          
          // Handle ethers v6 tuple/struct response
          const referralCount = Number(badgeData.referralCount ?? badgeData[1]);
          setTotalReferrals(referralCount);

          // For rewards total, query events from dynasty
          // Note: This might need an indexer for production
          const filter = dynastyContract.filters.RewardDistributed?.(address);
          if (filter) {
            const rewardEvents = await dynastyContract.queryFilter(filter, -10000);
            const total = rewardEvents.reduce((sum, event: any) => {
              const amount = event.args?.[1] ? Number(ethers.formatEther(event.args[1])) : 0;
              return sum + amount;
            }, 0);
            setTotalRewards(total);

            // Convert to event format for display
            const formattedEvents: ReferralEvent[] = rewardEvents.map((event: any) => ({
              type: 'reward',
              message: `Received ${ethers.formatEther(event.args?.[1] || 0)} STT reward`,
              timestamp: event.args?.[2] ? Number(event.args[2]) * 1000 : Date.now(),
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
  }, [address, getBadgeAddress]);

  return { events, isLoading, error, totalReferrals, totalRewards };
}