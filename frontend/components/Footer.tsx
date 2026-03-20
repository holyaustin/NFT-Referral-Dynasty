'use client';

import Link from 'next/link';
import { CONTRACT_ADDRESSES } from '@/lib/contract';
import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  // Format address for better display - shortened version
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy to clipboard function
  const copyToClipboard = async (address: string, type: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <footer className="relative border-t border-purple-500/30 bg-gradient-to-b from-gray/700 to-white/500 dark:from-dark-bg/80 dark:to-dark-bg/60 backdrop-blur-xl">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section - Enhanced */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3 group">
              <span className="text-3xl transform group-hover:scale-110 transition-transform duration-300">👑</span>
              <div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-2xl font-black tracking-tight">
                  Referral Dynasty
                </span>
                <div className="h-0.5 w-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mt-1" />
              </div>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed max-w-md">
              Dynamic NFT badges that evolve with your referral network, 
              <span className="text-purple-600 dark:text-purple-400 font-medium"> powered by Somnia Reactivity</span>.
            </p>
            
            {/* Social/Trust indicators */}
            <div className="flex items-center space-x-4 pt-2">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-600 dark:text-gray-300">Live on Testnet</span>
              </div>
              <div className="w-px h-4 bg-purple-500/30" />
              <span className="text-xs text-gray-500 dark:text-gray-400">v2.0.0</span>
            </div>
          </div>

          {/* Quick Links - Enhanced */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100">
              Navigation
              <span className="block w-8 h-0.5 bg-purple-600 rounded-full mt-1" />
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/badges', label: 'Badge Gallery' },
                { href: '/leaderboard', label: 'Leaderboard' },
                { href: '/register', label: 'Register' },
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="group flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-purple-600 transition-all duration-300 mr-0 group-hover:mr-2" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contract Addresses - Enhanced with shortened addresses */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100">
              Contracts
              <span className="block w-8 h-0.5 bg-purple-600 rounded-full mt-1" />
            </h3>
            <ul className="space-y-4">
              <li className="group">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dynasty Contract</p>
                <div className="relative flex items-center justify-between bg-purple-500/5 dark:bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20 group-hover:border-purple-500/40 transition-colors duration-300">
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-200">
                    {formatAddress(CONTRACT_ADDRESSES.referralDynasty)}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(CONTRACT_ADDRESSES.referralDynasty, 'dynasty')}
                    className="p-1.5 rounded-md hover:bg-purple-500/20 transition-colors duration-300"
                    title="Copy address"
                  >
                    {copiedAddress === 'dynasty' ? (
                      <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
              <li className="group">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Badge Contract</p>
                <div className="relative flex items-center justify-between bg-purple-500/5 dark:bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20 group-hover:border-purple-500/40 transition-colors duration-300">
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-200">
                    {formatAddress(CONTRACT_ADDRESSES.referralBadge)}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(CONTRACT_ADDRESSES.referralBadge, 'badge')}
                    className="p-1.5 rounded-md hover:bg-purple-500/20 transition-colors duration-300"
                    title="Copy address"
                  >
                    {copiedAddress === 'badge' ? (
                      <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            </ul>
            
            {/* Network badge */}
            <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
              <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Somnia Testnet</span>
            </div>
          </div>
        </div>

        {/* Bottom bar - Enhanced */}
        <div className="mt-12 pt-6 border-t border-purple-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Built with <span className="text-red-500 animate-pulse inline-block">❤️</span> for the{' '}
              <span className="text-purple-600 dark:text-purple-400 font-medium">Somnia Reactivity Hackathon</span>
            </p>
            
            <div className="flex items-center space-x-6">
              <Link href="/privacy" className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Terms
              </Link>
              <Link href="/docs" className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Docs
              </Link>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {currentYear} Referral Dynasty. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}