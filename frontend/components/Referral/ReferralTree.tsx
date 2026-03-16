'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { BadgeEvolution } from '../Badge/BadgeEvolution';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface TreeNode {
  address: string;
  referrals: TreeNode[];
  tier: number;
  referralCount: number;
}

interface ReferralTreeProps {
  address: string;
  depth?: number;
  maxDepth?: number;
}

export function ReferralTree({ address, depth = 0, maxDepth = 3 }: ReferralTreeProps) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const { isConnected } = useWallet();

  useEffect(() => {
    const fetchTree = async () => {
      if (!address) return;
      
      setLoading(true);
      try {
        // TODO: Fetch referral tree from contract/indexer
        // This is mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setTree({
          address,
          tier: Math.floor(Math.random() * 4),
          referralCount: Math.floor(Math.random() * 10),
          referrals: depth < maxDepth ? [
            {
              address: '0x1234...5678',
              tier: 1,
              referralCount: 3,
              referrals: [],
            },
            {
              address: '0x8765...4321',
              tier: 0,
              referralCount: 1,
              referrals: [],
            },
          ] : [],
        });
      } catch (error) {
        console.error('Error fetching referral tree:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [address, depth, maxDepth]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-8 bg-purple-500/20 rounded w-48" />
        <div className="h-16 bg-purple-500/20 rounded ml-8" />
      </div>
    );
  }

  if (!tree) return null;

  const isRoot = depth === 0;

  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        {!isRoot && (
          <div className="absolute left-[-20px] top-4 w-4 h-[2px] bg-purple-500/30" />
        )}
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 p-1 hover:bg-purple-500/10 rounded transition-colors"
        >
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        <div className="flex-1">
          <Link
            href={`/profile/${tree.address}`}
            className="group flex items-center gap-3 p-3 rounded-lg hover:bg-purple-500/5 transition-colors"
          >
            <BadgeEvolution tier={tree.tier} size="sm" />
            <div>
              <p className="font-mono text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {tree.address.slice(0, 6)}...{tree.address.slice(-4)}
              </p>
              <p className="text-xs text-gray-500">
                {tree.referralCount} referrals
              </p>
            </div>
          </Link>

          <AnimatePresence>
            {expanded && tree.referrals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-12 mt-2 space-y-2 border-l-2 border-purple-500/20 pl-4"
              >
                {tree.referrals.map((referral, i) => (
                  <ReferralTree
                    key={i}
                    address={referral.address}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}