'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useTheme } from '@/hooks/useTheme';
import { ConnectButton } from './Wallet/ConnectButton';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Badges', href: '/badges' },
  { name: 'Leaderboard', href: '/leaderboard' },
];

export default function Header() {
  const pathname = usePathname();
  const { isConnected, shortAddress, balance, disconnect } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-purple-500/20">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">👑</span>
              <span className="gradient-text text-xl font-bold">Referral Dynasty</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-purple-400 ${
                  pathname === item.href
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-purple-500/10 transition-colors"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Connect Button / Wallet Info */}
            <ConnectButton />

            {/* Mobile menu button */}
            <button
              className="md:hidden rounded-lg p-2 hover:bg-purple-500/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-base font-medium hover:bg-purple-500/10 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}