'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useTheme } from '@/hooks/useTheme';
import { ConnectButton } from './Wallet/ConnectButton';
import { Menu, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, useScroll, useTransform } from 'framer-motion';

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
  const [mounted, setMounted] = useState(false);
  
  // Framer Motion scroll animations
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0)', 'rgba(236, 11, 206, 0.95)']
  );
  const darkBackgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(17, 24, 39, 0)', 'rgba(17, 24, 39, 0.95)']
  );
  
  const boxShadow = useTransform(
    scrollY,
    [0, 100],
    ['0 0 0 0 rgba(0,0,0,0)', '0 10px 30px -10px rgba(0,0,0,0.3)']
  );
  
  const borderOpacity = useTransform(scrollY, [0, 100], [0.2, 0.5]);
  const height = useTransform(scrollY, [0, 100], ['64px', '56px']);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.header
      style={{
        backgroundColor: theme === 'dark' ? darkBackgroundColor : backgroundColor,
        boxShadow,
        height,
      }}
      className="sticky top-0 z-50 border-b border-purple-500/20"
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full" aria-label="Top">
        <motion.div 
          className="flex items-center justify-between h-full"
          initial={false}
        >
          {/* Logo with spring animation */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center"
          >
            <Link href="/" className="flex items-center space-x-2">
              <motion.span 
                className="text-2xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >👑</motion.span>
              <span className="gradient-text text-xl font-bold">Referral Dynasty</span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div 
            className="hidden md:flex md:items-center md:space-x-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {navigation.map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-purple-400 ${
                    pathname === item.href
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.name}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle with animation */}
            {mounted && (
              <motion.button
                onClick={toggleTheme}
                className="rounded-lg p-2 hover:bg-purple-500/10 transition-colors"
                aria-label="Toggle theme"
                whileHover={{ rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
              </motion.button>
            )}

            {/* Connect Button */}
            <ConnectButton />

            {/* Mobile menu button */}
            <motion.button
              className="md:hidden rounded-lg p-2 hover:bg-purple-500/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              whileTap={{ scale: 0.9 }}
              suppressHydrationWarning
            >
              <motion.div
                animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" suppressHydrationWarning />
                ) : (
                  <Bars3Icon className="h-6 w-6" suppressHydrationWarning />
                )}
              </motion.div>
            </motion.button>
          </div>
        </motion.div>

        {/* Mobile menu with Framer Motion */}
        <motion.div
          initial={false}
          animate={{
            height: mobileMenuOpen ? 'auto' : 0,
            opacity: mobileMenuOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 space-y-2 border-t border-purple-500/20 mt-2">
            {navigation.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={`block px-4 py-3 text-base font-medium rounded-lg transition-all ${
                    pathname === item.href
                      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-purple-500/10'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </motion.div>
            ))}
            
            {isConnected && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="px-4 py-4 mt-4 text-sm bg-purple-500/5 rounded-lg border border-purple-500/20"
              >
                <p className="font-mono text-purple-600 dark:text-purple-400">{shortAddress}</p>
                {balance && <p className="mt-2 font-semibold">{balance} STT</p>}
                <motion.button
                  onClick={() => {
                    disconnect();
                    setMobileMenuOpen(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-3 w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-all duration-300"
                >
                  Disconnect
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </nav>
    </motion.header>
  );
}