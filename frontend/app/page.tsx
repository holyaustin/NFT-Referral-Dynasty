'use client';

import { useWallet } from '@/hooks/useWallet';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const { isConnected } = useWallet();

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-purple-600 to-purple-900 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="gradient-text">Evolve Your Network</span>
            <br />
            with NFT Badges
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Every referral grows your network and evolves your unique NFT badge.
            Watch your badge transform from Bronze to Platinum in real-time.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {isConnected ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
              >
                Go to Dashboard
                <ArrowRightIcon className="inline-block ml-2 h-4 w-4" />
              </Link>
            ) : (
              <button
                  onClick={() => {(document.querySelector('connectkit-button') as HTMLButtonElement | null)?.click();  }}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
              >
                Connect Wallet to Start
              </button>
            )}
          </div>
        </div>

        {/* Feature grid */}
        <div className="mx-auto mt-32 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="relative glass-card p-6 hover:scale-105 transition-all duration-300 group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-purple-800/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
                <div className="relative">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold gradient-text">{feature.name}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-600 to-purple-900 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
      </div>
    </div>
  );
}

const features = [
  {
    name: 'Evolving NFTs',
    description: 'Your badge transforms from Bronze to Platinum as you refer more users.',
    icon: '✨',
  },
  {
    name: 'Real-time Updates',
    description: 'Watch your badge evolve instantly when someone uses your referral.',
    icon: '⚡',
  },
  {
    name: 'Cascading Rewards',
    description: 'Earn rewards from your entire referral network, up to 5 levels deep.',
    icon: '💰',
  },
  {
    name: 'Live Leaderboard',
    description: 'Compete with others and see top referrers in real-time.',
    icon: '🏆',
  },
  {
    name: 'IPFS Storage',
    description: 'Badge images and metadata stored permanently on IPFS.',
    icon: '📦',
  },
  {
    name: 'Somnia Reactivity',
    description: 'Powered by Somnia\'s native on-chain reactivity for instant responses.',
    icon: '⚙️',
  },
];