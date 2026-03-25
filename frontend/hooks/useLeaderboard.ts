'use client';

import { useState, useEffect } from 'react';
import { ethers, JsonRpcProvider } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI } from '@/lib/contract';

interface LeaderboardEntry {
  rank: number;
  address: string;
  referrals: number;
  tier: number;
  tokenId: number;
}

interface CachedData {
  leaders: LeaderboardEntry[];
  totalParticipants: number;
  timestamp: number;
  timeframe: string;
  totalBadges: number;
}

// ============ CONSTANTS ============
const SOMNIA_NETWORK = { chainId: 50312, name: 'somniaTestnet' };
const CACHE_KEY = 'leaderboard_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============ PROVIDER ============
const getReadOnlyProvider = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network';
  console.log(`🔌 [PROVIDER] Creating provider with RPC: ${rpcUrl}`);
  return new JsonRpcProvider(rpcUrl, SOMNIA_NETWORK, { staticNetwork: true });
};

// ============ CACHE UTILITIES ============
function getCachedData(timeframe: string): CachedData | null {
  console.log(`💾 [CACHE] Checking cache for timeframe: ${timeframe}`);
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedData = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    const isExpired = age >= CACHE_DURATION;
    const isSameTimeframe = data.timeframe === timeframe;
    
    console.log(`💾 [CACHE] Found cached data:`, {
      timeframe: data.timeframe,
      entries: data.leaders.length,
      age: `${Math.floor(age / 1000)}s`,
      expired: isExpired,
      sameTimeframe: isSameTimeframe
    });
    
    if (isSameTimeframe && !isExpired) {
      console.log(`✅ [CACHE] Using valid cached data`);
      return data;
    }
    return null;
  } catch (err) {
    console.error(`💾 [CACHE] Failed to read cache:`, err);
    return null;
  }
}

function setCachedData(
  leaders: LeaderboardEntry[],
  totalParticipants: number,
  timeframe: string,
  totalBadges: number
): void {
  console.log(`💾 [CACHE] Saving data to cache for timeframe: ${timeframe}`);
  if (typeof window === 'undefined') return;
  
  try {
    const data: CachedData = {
      leaders,
      totalParticipants,
      timestamp: Date.now(),
      timeframe,
      totalBadges
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.log(`✅ [CACHE] Saved ${leaders.length} entries, expires in ${CACHE_DURATION / 1000}s`);
  } catch (err) {
    console.error(`💾 [CACHE] Failed to cache data:`, err);
  }
}

// ============ OPTIMIZED LEADERBOARD HOOK - NO BLOCK SCANNING! ============
export function useLeaderboard(timeframe: string = 'all') {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalBadges, setTotalBadges] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      const startTime = Date.now();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏆 [LEADERBOARD] Starting fetch for timeframe: ${timeframe}`);
      console.log(`${'='.repeat(60)}`);

      // Check cache
      const cached = getCachedData(timeframe);
      if (cached) {
        setLeaders(cached.leaders);
        setTotalParticipants(cached.totalParticipants);
        setTotalBadges(cached.totalBadges);
        setIsLoading(false);
        setDebugInfo({ source: 'cache', age: Date.now() - cached.timestamp });
        console.log(`✅ [LEADERBOARD] Loaded from cache in 0ms`);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Initialize provider and contract
        console.log(`\n📍 [STEP 1] Initializing provider and contract...`);
        const providerStart = Date.now();
        const provider = getReadOnlyProvider();
        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );
        console.log(`✅ [STEP 1] Ready in ${Date.now() - providerStart}ms`);

        // Step 2: Get total badges count (ONE RPC CALL!)
        console.log(`\n📍 [STEP 2] Fetching total badges count...`);
        const totalStart = Date.now();
        const total = await badgeContract.totalBadges();
        const totalBadgesCount = Number(total);
        setTotalBadges(totalBadgesCount);
        console.log(`✅ [STEP 2] Total badges: ${totalBadgesCount} (${Date.now() - totalStart}ms)`);

        if (cancelled) return;

        if (totalBadgesCount === 0) {
          console.log(`⚠️ No badges found`);
          setLeaders([]);
          setTotalParticipants(0);
          setIsLoading(false);
          return;
        }

        // Step 3: Fetch all badge owners in BATCHES (MUCH FASTER than logs!)
        console.log(`\n📍 [STEP 3] Fetching badge owners for all ${totalBadgesCount} tokens...`);
        const ownersStart = Date.now();
        
        // Create an array of token IDs (1 to totalBadgesCount)
        const tokenIds = Array.from({ length: totalBadgesCount }, (_, i) => i + 1);
        
        // BATCH the owner queries to avoid rate limits
        const BATCH_SIZE = 50;
        const totalBatches = Math.ceil(tokenIds.length / BATCH_SIZE);
        
        const ownersByToken: Map<number, string> = new Map();
        let processedTokens = 0;
        let failedTokens = 0;
        
        console.log(`   Total tokens: ${tokenIds.length}, batches: ${totalBatches}`);
        
        for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const batch = tokenIds.slice(i, i + BATCH_SIZE);
          
          console.log(`   Batch ${batchNum}/${totalBatches}: fetching owners for tokens ${batch[0]}-${batch[batch.length - 1]}...`);
          const batchStart = Date.now();
          
          const batchPromises = batch.map(async (tokenId) => {
            try {
              const owner = await badgeContract.ownerOf(tokenId);
              return { tokenId, owner };
            } catch (err) {
              console.warn(`   ⚠️ Failed to fetch owner for token ${tokenId}:`, err);
              failedTokens++;
              return null;
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          let batchSuccess = 0;
          
          for (const result of batchResults) {
            if (result) {
              ownersByToken.set(result.tokenId, result.owner);
              batchSuccess++;
            }
          }
          
          processedTokens += batch.length;
          console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${batchSuccess}/${batch.length} successful (${Date.now() - batchStart}ms)`);
          console.log(`   📊 Progress: ${processedTokens}/${tokenIds.length} tokens processed, ${failedTokens} failed`);
          
          // Small delay to avoid rate limiting
          if (i + BATCH_SIZE < tokenIds.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        const ownersTime = Date.now() - ownersStart;
        console.log(`✅ [STEP 3] Fetched ${ownersByToken.size} owners in ${ownersTime}ms (${failedTokens} failed)`);

        if (cancelled) return;

        // Step 4: Get unique users and their latest badge
        console.log(`\n📍 [STEP 4] Aggregating users by latest badge...`);
        const aggStart = Date.now();
        
        // Map: user address -> { latestTokenId, referrals, tier }
        const userMap = new Map<string, { tokenId: number; referrals: number; tier: number }>();
        
        for (const [tokenId, owner] of ownersByToken.entries()) {
          const existing = userMap.get(owner);
          if (!existing || existing.tokenId < tokenId) {
            // Fetch badge data for this token
            try {
              const badgeData = await badgeContract.getBadge(tokenId);
              userMap.set(owner, {
                tokenId,
                referrals: Number(badgeData.referralCount),
                tier: Number(badgeData.tier)
              });
            } catch (err) {
              console.warn(`   ⚠️ Failed to fetch badge data for token ${tokenId}:`, err);
            }
          }
        }
        
        console.log(`✅ [STEP 4] Aggregated ${userMap.size} unique users (${Date.now() - aggStart}ms)`);

        if (cancelled) return;

        // Step 5: Convert to leaderboard entries
        console.log(`\n📍 [STEP 5] Creating leaderboard entries...`);
        const entries: LeaderboardEntry[] = [];
        
        for (const [address, data] of userMap.entries()) {
          entries.push({
            rank: 0,
            address,
            referrals: data.referrals,
            tier: data.tier,
            tokenId: data.tokenId
          });
        }
        
        console.log(`✅ [STEP 5] Created ${entries.length} entries`);

        // Step 6: Sort and rank
        console.log(`\n📍 [STEP 6] Sorting and ranking...`);
        const sortStart = Date.now();
        
        // Sort by referrals (descending)
        const sortedEntries = entries
          .sort((a, b) => b.referrals - a.referrals)
          .map((entry, index) => ({ ...entry, rank: index + 1 }))
          .slice(0, 100); // Top 100 only
        
        console.log(`✅ [STEP 6] Sorted ${sortedEntries.length} entries (${Date.now() - sortStart}ms)`);
        if (sortedEntries.length > 0) {
          console.log(`   🥇 Top referrer: ${sortedEntries[0].address.slice(0, 8)}... with ${sortedEntries[0].referrals} referrals`);
          console.log(`   🥈 Second: ${sortedEntries[1]?.address.slice(0, 8)}... with ${sortedEntries[1]?.referrals || 0} referrals`);
          console.log(`   🥉 Third: ${sortedEntries[2]?.address.slice(0, 8)}... with ${sortedEntries[2]?.referrals || 0} referrals`);
        }

        // Step 7: Cache and update state
        console.log(`\n📍 [STEP 7] Caching and updating state...`);
        const totalTime = Date.now() - startTime;
        
        setCachedData(sortedEntries, sortedEntries.length, timeframe, totalBadgesCount);
        setLeaders(sortedEntries);
        setTotalParticipants(sortedEntries.length);
        
        setDebugInfo({
          source: 'live',
          totalTime,
          totalBadges: totalBadgesCount,
          uniqueUsers: userMap.size,
          entriesProcessed: entries.length,
          topReferral: sortedEntries[0]?.referrals || 0
        });
        
        console.log(`✅ [STEP 7] State updated`);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎉 [LEADERBOARD] Complete! Total time: ${totalTime}ms`);
        console.log(`   Total badges scanned: ${totalBadgesCount}`);
        console.log(`   Unique users: ${userMap.size}`);
        console.log(`   Leaderboard entries: ${sortedEntries.length}`);
        console.log(`   Top referral count: ${sortedEntries[0]?.referrals || 0}`);
        console.log(`${'='.repeat(60)}\n`);

      } catch (err: any) {
        console.error(`\n❌ [LEADERBOARD] FATAL ERROR:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Stack: ${err.stack}`);
        console.error(`   Code: ${err.code}`);
        
        if (!cancelled) {
          setError(err.message || 'Failed to load leaderboard');
        }
      } finally {
        if (!cancelled) {
          console.log(`🏁 [LEADERBOARD] Fetch completed, isLoading: false`);
          setIsLoading(false);
        }
      }
    };

    fetchLeaderboard();
    return () => { 
      console.log(`🛑 [LEADERBOARD] Cancelled for timeframe: ${timeframe}`);
      cancelled = true; 
    };
  }, [timeframe]);

  return { leaders, isLoading, error, totalParticipants, totalBadges, debugInfo };
}