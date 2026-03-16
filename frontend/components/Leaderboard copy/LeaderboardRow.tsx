'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface LeaderboardRowProps {
  entry: {
    rank: number;
    address: string;
    referralCount: number;
    tier: number;
    totalRewards: string;
    badgeImage?: string;
  };
  isCurrentUser?: boolean;
  index: number;
}

const tierColors = ['text-amber-600', 'text-gray-400', 'text-yellow-500', 'text-purple-400'];
const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const rankEmojis = ['🥇', '🥈', '🥉'];

export function LeaderboardRow({ entry, isCurrentUser, index }: LeaderboardRowProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <motion.tr
      id={`rank-${entry.address}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors ${
        isCurrentUser ? 'bg-purple-500/10 ring-2 ring-purple-500 ring-inset' : ''
      }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {entry.rank <= 3 ? (
            <span className="text-2xl">{rankEmojis[entry.rank - 1]}</span>
          ) : (
            <span className="font-mono text-sm text-gray-500">#{entry.rank}</span>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {entry.badgeImage ? (
            <img src={entry.badgeImage} alt="badge" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center text-white">
              {entry.rank}
            </div>
          )}
          <div>
            <p className="font-mono text-sm">{formatAddress(entry.address)}</p>
            {isCurrentUser && (
              <span className="text-xs text-purple-600 dark:text-purple-400">(You)</span>
            )}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tierColors[entry.tier]}`} />
          <span className={`font-medium ${tierColors[entry.tier]}`}>
            {tierNames[entry.tier]}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4">
        <span className="font-bold text-purple-600 dark:text-purple-400">
          {entry.referralCount}
        </span>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span>{entry.tier + 1}</span>
        </div>
      </td>
      
      <td className="px-6 py-4">
        <span className="font-semibold">{entry.totalRewards} STT</span>
      </td>
      
      <td className="px-6 py-4">
        <Link
          href={`/profile/${entry.address}`}
          className="inline-flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          View <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </Link>
      </td>
    </motion.tr>
  );
}