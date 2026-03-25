'use client';

import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'next/navigation';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export function ConnectButton() {
  const { isConnected, shortAddress, balance, connect, disconnect } = useWallet();
  const router = useRouter();

  // Create a handler for disconnect with redirect to home
  const handleDisconnect = () => {
    disconnect();
    router.push('/'); // Redirect to home page after disconnect
  };

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center space-x-2 rounded-lg bg-purple-500/10 px-4 py-2 text-sm font-medium hover:bg-purple-500/20 transition-colors border border-purple-500/30">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>{shortAddress}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl glass-card border border-purple-500/20 shadow-xl focus:outline-none">
          <div className="px-4 py-3 border-b border-purple-500/20">
            <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
            <p className="text-sm font-medium gradient-text">{balance}</p>
          </div>
          <div className="p-2">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleDisconnect}
                  className={`${
                    active ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ''
                  } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                >
                  Disconnect
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}