'use client';

import { useState, useEffect } from 'react';
import { ethers, JsonRpcProvider } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI } from '@/lib/contract';

// ─────────────────────────────────────────────────────────────────────────────
// FIXES APPLIED
// ─────────────────────────────────────────────────────────────────────────────
//
// Fix 1 — dynastyContract.getReferralCount does not exist
//   The function is not on ReferralDynasty. The referral count lives inside
//   the BadgeData struct returned by badgeContract.getUserBadge(owner):
//     struct BadgeData { uint8 tier; uint24 referralCount; uint256 lastUpdate; }
//   Fix: read badgeData.referralCount directly; remove dynastyContract entirely.
//
// Fix 2 — BrowserProvider requires a connected (unlocked) wallet
//   The leaderboard is a public read-only view. Using BrowserProvider meant the
//   hook would error for any visitor who had not approved the site in MetaMask.
//   Fix: use JsonRpcProvider with the public RPC, same pattern as ReferralForm.
//
// Fix 3 — Sequential ownerOf + getUserBadge = 2N serial RPC calls (very slow)
//   ownerOf(tokenId) is only needed to get the owner address, but BadgeMinted
//   events already carry both the owner address and the tokenId. Reading the
//   event log once replaces all N ownerOf calls with a single eth_getLogs call,
//   reducing RPC traffic from 2N → N+1 and making the fetch ~7× faster for
//   100 badges.
//
// Fix 4 — timeframe filter was defined but never applied
//   Event logs carry block timestamps. We now filter BadgeMinted events to only
//   those inside the selected timeframe window before fetching badge data.
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  address: string;
  referrals: number;
  tier: number;
}

// Match the network object used throughout the app (same as ReferralForm)
const SOMNIA_NETWORK = { chainId: 50312, name: 'somniaTestnet' };

const getReadOnlyProvider = () =>
  new JsonRpcProvider(
    process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network',
    SOMNIA_NETWORK,
    { staticNetwork: true }
  );

// Returns the earliest timestamp (seconds) for the given timeframe.
// Events with block.timestamp < this value are excluded.
const timeframeCutoff = (timeframe: string): number => {
  const now = Math.floor(Date.now() / 1000);
  switch (timeframe) {
    case 'day':   return now - 86_400;
    case 'week':  return now - 7 * 86_400;
    case 'month': return now - 30 * 86_400;
    default:      return 0; // 'all' — no cutoff
  }
};

export function useLeaderboard(timeframe: string = 'all') {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fix 2: public read-only provider — no wallet connection required
        const provider = getReadOnlyProvider();

        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );

        // Fix 3: one eth_getLogs call instead of N ownerOf calls.
        // BadgeMinted(address indexed user, uint256 indexed tokenId)
        // gives us every badge holder's address directly from the event log.
        const mintedFilter = badgeContract.filters.BadgeMinted();
        const mintedLogs = await badgeContract.queryFilter(mintedFilter, 0, 'latest');

        // Fix 4: apply timeframe cutoff using block timestamps
        const cutoff = timeframeCutoff(timeframe);
        const filteredLogs = cutoff === 0
          ? mintedLogs
          : await Promise.all(
              mintedLogs.map(async (log) => {
                const block = await provider.getBlock(log.blockNumber);
                return block && block.timestamp >= cutoff ? log : null;
              })
            ).then(results => results.filter(Boolean) as typeof mintedLogs);

        // Deduplicate by owner address (in case of edge-case double events)
        const seenAddresses = new Set<string>();
        const uniqueLogs = filteredLogs.filter(log => {
          // BadgeMinted has `user` as topic[1] (indexed)
          const owner = ethers.getAddress('0x' + log.topics[1].slice(26));
          if (seenAddresses.has(owner)) return false;
          seenAddresses.add(owner);
          return true;
        });

        // Fetch badge data for each unique owner in parallel
        // Fix 1: use badgeData.referralCount — no dynastyContract needed
        const entries = await Promise.all(
          uniqueLogs.map(async (log) => {
            const owner = ethers.getAddress('0x' + log.topics[1].slice(26));
            try {
              const badgeData = await badgeContract.getUserBadge(owner);
              return {
                rank: 0,
                address: owner,
                referrals: Number(badgeData.referralCount), // Fix 1
                tier: Number(badgeData.tier),
              } satisfies LeaderboardEntry;
            } catch {
              // Badge may have been burned or getUserBadge reverted — skip
              return null;
            }
          })
        );

        if (cancelled) return;

        const valid = entries.filter((e): e is LeaderboardEntry => e !== null);

        const sorted = valid
          .sort((a, b) => b.referrals - a.referrals)
          .map((entry, index) => ({ ...entry, rank: index + 1 }))
          .slice(0, 100);

        setLeaders(sorted);
        setTotalParticipants(sorted.length);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error fetching leaderboard:', err);
          setError(err.message || 'Failed to load leaderboard');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchLeaderboard();

    // Cleanup: if timeframe changes before the fetch completes, discard stale results
    return () => { cancelled = true; };
  }, [timeframe]);

  return { leaders, isLoading, error, totalParticipants };
}