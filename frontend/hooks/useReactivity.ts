'use client';

import { useEffect, useState } from 'react';
import { SDK } from '@somnia-chain/reactivity';
import { createPublicClient, webSocket, decodeEventLog, keccak256, toHex, Log } from 'viem';
import { somniaTestnet } from '@/lib/chain';
import { CONTRACT_ADDRESSES, REFERRAL_DYNASTY_ABI } from '@/lib/contract';

// Define the expected event types
type EventName = 'BadgeEvolved' | 'ReferralProcessed' | 'RewardDistributed';

interface ReactivityEvent {
  type: EventName;
  data: any;
  timestamp: number;
  transactionHash?: string;
}

// Type guard function
function isValidEventName(name: unknown): name is EventName {
  if (typeof name !== 'string') return false;
  return ['BadgeEvolved', 'ReferralProcessed', 'RewardDistributed'].includes(name);
}

export function useReactivity(address?: string) {
  const [events, setEvents] = useState<ReactivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any;
    let mounted = true;

    const connect = async () => {
      try {
        const publicClient = createPublicClient({
          chain: somniaTestnet,
          transport: webSocket(),
        });

        const sdk = new SDK({ public: publicClient });

        // Calculate event signatures
        const badgeEvolvedTopic = keccak256(toHex('BadgeEvolved(address,uint256,uint256)'));
        const referralProcessedTopic = keccak256(toHex('ReferralProcessed(address,address,uint256)'));
        const rewardDistributedTopic = keccak256(toHex('RewardDistributed(address,uint256,string)'));

        subscription = await sdk.subscribe({
          ethCalls: [],
          eventContractSources: [CONTRACT_ADDRESSES.referralDynasty as `0x${string}`],
          topicOverrides: [badgeEvolvedTopic, referralProcessedTopic, rewardDistributedTopic],
          onlyPushChanges: true,
          
          onData: (data: any) => {
            if (!mounted) return;

            try {
              // Safely decode the event log
              const decodedLog = decodeEventLog({
                abi: REFERRAL_DYNASTY_ABI,
                topics: data.result.topics,
                data: data.result.data,
              });

              // Handle undefined eventName safely
              const eventName = decodedLog.eventName;
              
              // Skip if eventName is undefined or not a valid event
              if (!isValidEventName(eventName)) {
                console.debug('Skipping unknown or undefined event:', eventName);
                return;
              }

              // Now TypeScript knows eventName is valid
              const args = decodedLog.args as any;
              
              // Filter by address if needed
              if (address) {
                const involvesAddress = 
                  (args.owner?.toLowerCase() === address.toLowerCase()) ||
                  (args.user?.toLowerCase() === address.toLowerCase()) ||
                  (args.referrer?.toLowerCase() === address.toLowerCase()) ||
                  (args.referee?.toLowerCase() === address.toLowerCase());
                
                if (!involvesAddress) return;
              }

              const newEvent: ReactivityEvent = {
                type: eventName, // TypeScript knows this is EventName
                data: args,
                timestamp: Date.now(),
                transactionHash: data.result.transactionHash,
              };

              setEvents(prev => [newEvent, ...prev].slice(0, 50));
            } catch (decodeErr) {
              console.error('Error decoding event:', decodeErr);
            }
          },
          
          onError: (err: any) => {
            console.error('Subscription error:', err);
            if (mounted) setError(err?.message || 'Subscription error');
          },
        });

        if (mounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err: any) {
        console.error('Reactivity connection error:', err);
        if (mounted) {
          setError(err?.message || 'Failed to connect');
          setIsConnected(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [address]);

  const clearEvents = () => setEvents([]);

  return { events, isConnected, error, clearEvents };
}