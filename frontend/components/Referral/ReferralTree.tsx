'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, REFERRAL_DYNASTY_ABI, REFERRAL_BADGE_ABI } from '@/lib/contract';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      if (!address || !window.ethereum) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const dynastyContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralDynasty,
          REFERRAL_DYNASTY_ABI,
          provider
        );
        const badgeContract = new ethers.Contract(
          CONTRACT_ADDRESSES.referralBadge,
          REFERRAL_BADGE_ABI,
          provider
        );

        // Get user's badge tier
        const hasBadge = await badgeContract.hasBadge(address);
        const tier = hasBadge ? (await badgeContract.getUserBadge(address)).tier : 0;
        
        // Get referral count
        const referralCount = await dynastyContract.getReferralCount(address);

        // Get downline addresses if not at max depth
        let downline: string[] = [];
        if (depth < maxDepth) {
          // Try to get downline (you may need to add this function to your contract)
          // For now, we'll use a simpler approach
          downline = []; // Placeholder
        }

        // Build tree recursively
        const children: TreeNode[] = [];
        for (const childAddr of downline) {
          if (depth < maxDepth - 1) {
            const childTree = await fetchChildTree(childAddr, depth + 1, maxDepth, provider);
            if (childTree) {
              children.push(childTree);
            }
          }
        }

        setTree({
          address,
          tier: Number(tier),
          referralCount: Number(referralCount),
          referrals: children,
        });
      } catch (err: any) {
        console.error('Error fetching referral tree:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [address, depth, maxDepth]);

  const fetchChildTree = async (
    childAddr: string,
    currentDepth: number,
    maxDepth: number,
    provider: ethers.Provider
  ): Promise<TreeNode | null> => {
    try {
      const dynastyContract = new ethers.Contract(
        CONTRACT_ADDRESSES.referralDynasty,
        REFERRAL_DYNASTY_ABI,
        provider
      );
      const badgeContract = new ethers.Contract(
        CONTRACT_ADDRESSES.referralBadge,
        REFERRAL_BADGE_ABI,
        provider
      );

      const hasBadge = await badgeContract.hasBadge(childAddr);
      const tier = hasBadge ? (await badgeContract.getUserBadge(childAddr)).tier : 0;
      const referralCount = await dynastyContract.getReferralCount(childAddr);

      return {
        address: childAddr,
        tier: Number(tier),
        referralCount: Number(referralCount),
        referrals: [], // We'll stop at first level for performance
      };
    } catch (err) {
      console.error('Error fetching child tree:', err);
      return null;
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-500">Error loading referral tree</p>
      </div>
    );
  }

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