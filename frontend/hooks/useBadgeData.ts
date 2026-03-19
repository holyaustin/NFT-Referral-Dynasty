'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI, REFERRAL_DYNASTY_ABI } from '@/lib/contract';

interface BadgeData {
  tier: number;
  referralCount: number;
  lastUpdate: number;
}

export function useBadgeData(address: string | undefined) {
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Error getting badge address from dynasty:', err);
      throw new Error('Failed to get badge contract address');
    }
  }, []);

  const fetchBadge = useCallback(async () => {
    // Clear state if no address
    if (!address) {
      setBadge(null);
      setError(null);
      return;
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      setError('Invalid address format');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if ethereum is available
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Verify we're on the right network
      const network = await provider.getNetwork();
      console.log('Connected to network:', {
        chainId: Number(network.chainId),
        name: network.name
      });

      // Get the actual badge address from dynasty contract
      const badgeAddress = await getBadgeAddress(provider);
      console.log('Using badge address:', badgeAddress);
      
      const badgeContract = new ethers.Contract(
        badgeAddress,
        REFERRAL_BADGE_ABI,
        provider
      );

      // First check if the contract exists at the address
      const code = await provider.getCode(badgeAddress);
      if (code === '0x') {
        throw new Error('No contract found at the badge address');
      }

      // Check if user has a badge
      let hasBadge = false;
      try {
        hasBadge = await badgeContract.hasBadge(address);
        console.log('hasBadge result:', hasBadge);
      } catch (err) {
        console.error('Error calling hasBadge:', err);
        throw new Error('Failed to check badge status. Make sure you\'re on the Somnia testnet.');
      }
      
      if (hasBadge) {
        try {
          const badgeData = await badgeContract.getUserBadge(address);
          console.log('badgeData:', badgeData);
          
          // Handle ethers v6 tuple/struct response
          const tier = Number(badgeData.tier ?? badgeData[0]);
          const referralCount = Number(badgeData.referralCount ?? badgeData[1]);
          const lastUpdate = Number(badgeData.lastUpdate ?? badgeData[2]);
          
          setBadge({
            tier,
            referralCount,
            lastUpdate,
          });
        } catch (err) {
          console.error('Error fetching badge data:', err);
          throw new Error('Failed to fetch badge data');
        }
      } else {
        setBadge(null);
      }
    } catch (err: any) {
      console.error('Error in fetchBadge:', err);
      setError(err.message || 'Failed to fetch badge data');
    } finally {
      setIsLoading(false);
    }
  }, [address, getBadgeAddress]);

  useEffect(() => {
    fetchBadge();
  }, [fetchBadge]);

  return { badge, isLoading, error, refetch: fetchBadge };
}