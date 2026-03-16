'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface BadgeEvolutionProps {
  tier: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const tierConfigs = [
  {
    name: 'Bronze',
    color: '#cd7f32',
    icon: '🟤',
    pattern: 'radial-gradient(circle at 30% 30%, #ffd700, #cd7f32)',
  },
  {
    name: 'Silver',
    color: '#c0c0c0',
    icon: '⚪',
    pattern: 'radial-gradient(circle at 30% 30%, #ffffff, #c0c0c0)',
  },
  {
    name: 'Gold',
    color: '#ffd700',
    icon: '🟡',
    pattern: 'radial-gradient(circle at 30% 30%, #fff5b0, #ffd700)',
  },
  {
    name: 'Platinum',
    color: '#e5e4e2',
    icon: '💎',
    pattern: 'radial-gradient(circle at 30% 30%, #ffffff, #e5e4e2)',
  },
];

const sizes = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export function BadgeEvolution({ tier, size = 'md', animated = true }: BadgeEvolutionProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const config = tierConfigs[tier] || tierConfigs[0];

  useEffect(() => {
    if (animated) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [tier, animated]);

  return (
    <motion.div
      className={`relative ${sizes[size]} rounded-full flex items-center justify-center cursor-pointer group`}
      style={{
        background: config.pattern,
        boxShadow: `0 0 20px ${config.color}40`,
      }}
      animate={isAnimating ? {
        scale: [1, 1.2, 1],
        rotate: [0, 360, 0],
      } : {}}
      transition={{ duration: 1 }}
      whileHover={{ scale: 1.1 }}
    >
      {/* Inner glow */}
      <div className="absolute inset-0 rounded-full bg-white opacity-20 group-hover:opacity-30 transition-opacity" />
      
      {/* Icon */}
      <span className="text-2xl relative z-10">{config.icon}</span>

      {/* Tier indicator */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        {config.name}
      </div>

      {/* Particles on animation */}
      {isAnimating && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                opacity: 1,
              }}
              animate={{
                x: `${50 + Math.cos(i * 45) * 100}%`,
                y: `${50 + Math.sin(i * 45) * 100}%`,
                opacity: 0,
              }}
              transition={{ duration: 1 }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}