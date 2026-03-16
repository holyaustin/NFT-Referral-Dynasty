'use client';

import { useState, useEffect } from 'react';

interface ReferralEvent {
  type: 'referral' | 'reward';
  message: string;
  timestamp: number;
  amount?: number;
}

export function useReferralEvents(address: string | undefined) {
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalReferrals = events.filter(e => e.type === 'referral').length;
  const totalRewards = events
    .filter(e => e.type === 'reward')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!address) return;

      setIsLoading(true);
      setError(null);

      try {
        // TODO: Fetch events from contract/indexer
        // This is mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockEvents: ReferralEvent[] = [
          {
            type: 'referral',
            message: 'New user joined using your referral',
            timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
          },
          {
            type: 'reward',
            message: 'Received 0.0001 STT reward',
            timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
            amount: 0.0001,
          },
          {
            type: 'referral',
            message: 'Another successful referral',
            timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
          },
        ];

        setEvents(mockEvents);
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