'use client';

import Link from 'next/link';
import { BadgeEvolution } from '../Badge/BadgeEvolution';
import { TrophyIcon } from '@heroicons/react/24/outline';

interface LeaderboardRowProps {
  leader: {
    rank: number;
    address: string;
    referrals: number;
    tier: number;
    badgeImage?: string;
  };
}

const rankColors = [
  'text-yellow-500', // 1st
  'text-gray-400',   // 2nd
  'text-amber-700',  // 3rd
];

export function LeaderboardRow({ leader }: LeaderboardRowProps) {
  const rankColor = leader.rank <= 3 ? rankColors[leader.rank - 1] : 'text-gray-500';

  return (
    <>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {leader.rank <= 3 && <TrophyIcon className={`h-5 w-5 ${rankColor}`} />}
          <span className={`font-mono font-bold ${rankColor}`}>#{leader.rank}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <Link
          href={`/profile/${leader.address}`}
          className="font-mono text-sm hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
        </Link>
      </td>
      <td className="px-6 py-4 text-right font-bold gradient-text">{leader.referrals}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <BadgeEvolution tier={leader.tier} size="sm" />
          <span className="text-sm">{['Bronze', 'Silver', 'Gold', 'Platinum'][leader.tier]}</span>
        </div>
      </td>
    </>
  );
}