'use client';

import { useState, useEffect } from 'react';
import { ethers, JsonRpcProvider } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI } from '@/lib/contract';

// ─────────────────────────────────────────────────────────────────────────────
// Fix 5 — Somnia RPC rejects eth_getLogs with block range > 1000
//
// The node returns: { code: -1, message: "block range exceeds 1000" }
// for any eth_getLogs call whose (toBlock - fromBlock) exceeds 1000.
//
// Solution: paginate. Fetch logs in CHUNK_SIZE-block windows from the
// contract's deploy block to the current head, accumulating results.
//
// BADGE_DEPLOY_BLOCK should be set in .env.local as
//   NEXT_PUBLIC_BADGE_DEPLOY_BLOCK=<block number when ReferralBadge deployed>
// If not set, falls back to current block - 200,000 as a conservative default.
// The smaller this number is (i.e. the closer to the real deploy block), the
// fewer chunks are needed and the faster the leaderboard loads.
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  address: string;
  referrals: number;
  tier: number;
}

const SOMNIA_NETWORK = { chainId: 50312, name: 'somniaTestnet' };
const CHUNK_SIZE = 900; // safely under the 1000-block RPC limit

const getReadOnlyProvider = () =>
  new JsonRpcProvider(
    process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network',
    SOMNIA_NETWORK,
    { staticNetwork: true }
  );

const timeframeCutoff = (timeframe: string): number => {
  const now = Math.floor(Date.now() / 1000);
  switch (timeframe) {
    case 'day':   return now - 86_400;
    case 'week':  return now - 7 * 86_400;
    case 'month': return now - 30 * 86_400;
    default:      return 0;
  }
};

/**
 * Fetch all logs for a given filter by paginating in CHUNK_SIZE-block windows.
 * Somnia testnet rejects any eth_getLogs request spanning more than 1000 blocks.
 */
async function getPaginatedLogs(
  contract: ethers.Contract,
  filter: ethers.ContractEventName,
  fromBlock: number,
  toBlock: number
): Promise<ethers.EventLog[]> {
  const allLogs: ethers.EventLog[] = [];

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
    const chunk = await contract.queryFilter(filter, start, end);
    allLogs.push(...(chunk as ethers.EventLog[]));
  }

  return allLogs;
}

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
        const provider = getReadOnlyProvider();

        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );

        // Determine the block window to scan.
        // For timeframes shorter than 'all', compute the approximate start block
        // using Somnia's ~1 block/second rate to minimise the number of chunks.
        const currentBlock = await provider.getBlockNumber();

        let fromBlock: number;
        if (timeframe === 'all') {
          // Use the env-configured deploy block, or fall back to 200k blocks ago.
          fromBlock = process.env.NEXT_PUBLIC_BADGE_DEPLOY_BLOCK
            ? Number(process.env.NEXT_PUBLIC_BADGE_DEPLOY_BLOCK)
            : Math.max(0, currentBlock - 200_000);
        } else {
          // Estimate blocks back based on seconds (Somnia ≈ 1 block/sec).
          const secondsBack = {
            day:   86_400,
            week:  7 * 86_400,
            month: 30 * 86_400,
          }[timeframe] ?? 0;
          fromBlock = Math.max(0, currentBlock - secondsBack);
        }

        // Paginate BadgeMinted logs across the full block range.
        const mintedFilter = badgeContract.filters.BadgeMinted();
        const mintedLogs = await getPaginatedLogs(
          badgeContract,
          mintedFilter,
          fromBlock,
          currentBlock
        );

        if (cancelled) return;

        // Apply timestamp-based timeframe filter.
        // For 'all' we skip this (cutoff = 0) to avoid N extra getBlock calls.
        const cutoff = timeframeCutoff(timeframe);
        let filteredLogs = mintedLogs;

        if (cutoff > 0) {
          const withTimestamps = await Promise.all(
            mintedLogs.map(async (log) => {
              const block = await provider.getBlock(log.blockNumber);
              return block && block.timestamp >= cutoff ? log : null;
            })
          );
          filteredLogs = withTimestamps.filter(Boolean) as ethers.EventLog[];
        }

        if (cancelled) return;

        // Deduplicate by owner — keep the latest event per address.
        const latestByOwner = new Map<string, ethers.EventLog>();
        for (const log of filteredLogs) {
          const owner = ethers.getAddress('0x' + log.topics[1].slice(26));
          latestByOwner.set(owner, log);
        }

        // Fetch badge data for every unique owner in parallel.
        // badgeData.referralCount is the correct source (Fix 1 from previous session).
        const entries = await Promise.all(
          [...latestByOwner.keys()].map(async (owner) => {
            try {
              const badgeData = await badgeContract.getUserBadge(owner);
              return {
                rank: 0,
                address: owner,
                referrals: Number(badgeData.referralCount),
                tier: Number(badgeData.tier),
              } satisfies LeaderboardEntry;
            } catch {
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
    return () => { cancelled = true; };
  }, [timeframe]);

  return { leaders, isLoading, error, totalParticipants };
}