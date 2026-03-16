'use client';

import { BadgeCard } from './BadgeCard';
import { motion } from 'framer-motion';

interface BadgeGalleryProps {
  badges: any[];
  filter: string;
  search: string;
}

export function BadgeGallery({ badges, filter, search }: BadgeGalleryProps) {
  const filteredBadges = badges.filter((badge) => {
    const matchesFilter = filter === 'all' || badge.tier === parseInt(filter);
    const matchesSearch = badge.owner?.toLowerCase().includes(search.toLowerCase()) ||
                         badge.tokenId?.toString().includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {filteredBadges.map((badge, index) => (
        <motion.div
          key={badge.tokenId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <BadgeCard
            badge={badge.badgeData}
            address={badge.owner}
            isPublic
          />
        </motion.div>
      ))}
    </motion.div>
  );
}