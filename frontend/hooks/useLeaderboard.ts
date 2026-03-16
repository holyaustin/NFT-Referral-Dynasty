'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  address: string;
  referrals: number;
  tier: number;
}

export function useLeaderboard(timeframe: string = 'all') {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: Fetch leaderboard from contract/indexer
        // This is mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockLeaders = Array.from({ length: 20 }, (_, i) => ({
          rank: i + 1,
          address: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
          referrals: Math.floor(Math.random() * 100),
          tier: Math.floor(Math.random() * 4),
        })).sort((a, b) => b.referrals - a.referrals)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setLeaders(mockLeaders);
        setTotalParticipants(mockLeaders.length);
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe]);

  return { leaders, isLoading, error, totalParticipants };
}