'use client';

import Link from 'next/link';
import { CONTRACT_ADDRESSES } from '@/lib/contract';

export default function Footer() {
  return (
    <footer className="border-t border-purple-500/20 bg-white/50 dark:bg-dark-bg/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">👑</span>
              <span className="gradient-text text-xl font-bold">Referral Dynasty</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Dynamic NFT badges that evolve with your referral network, powered by Somnia Reactivity.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold gradient-text mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/badges" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Badge Gallery
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Contract Addresses */}
          <div>
            <h3 className="text-sm font-semibold gradient-text mb-4">Contracts</h3>
            <ul className="space-y-2">
              <li>
                <p className="text-xs text-gray-500">Dynasty</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                  {CONTRACT_ADDRESSES.referralDynasty}
                </p>
              </li>
              <li>
                <p className="text-xs text-gray-500">Badge</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                  {CONTRACT_ADDRESSES.referralBadge}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-purple-500/20 text-center text-xs text-gray-500">
          <p>Built with ❤️ for the Somnia Reactivity Hackathon</p>
          <p className="mt-2">© {new Date().getFullYear()} Referral Dynasty. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}