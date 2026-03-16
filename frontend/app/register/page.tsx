'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'next/navigation';
import { ReferralForm } from '@/components/Referral/ReferralForm';
import { CONTRACT_ADDRESSES } from '@/lib/contract';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function RegisterPage() {
  const { isConnected, address, connect } = useWallet();
  const router = useRouter();
  const [registered, setRegistered] = useState(false);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-3xl font-bold gradient-text">Join Referral Dynasty</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect your wallet to get started and receive your genesis badge
          </p>
          <button
            onClick={connect}
            className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Check if address exists after connection
  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Loading wallet address...</p>
        </div>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <CheckCircleIcon className="h-20 w-20 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Registration Successful!</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your genesis badge has been minted. Start referring to evolve it!
          </p>
          <div className="pt-4 space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/badges')}
              className="rounded-xl border border-purple-500 px-6 py-3 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all duration-300"
            >
              View Badges
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Register for Referral Dynasty</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Get your genesis badge and start building your referral network
          </p>
        </div>

        {/* Registration Card */}
        <div className="glass-card p-8">
          <div className="mb-6 p-4 bg-purple-500/10 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">Your Address:</span>{' '}
              <span className="font-mono">{address}</span>
            </p>
          </div>

          {/* Now address is guaranteed to be a string */}
          <ReferralForm 
            address={address} 
            onSuccess={() => setRegistered(true)}
            redirectToDashboard={false}
          />

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Already registered? <button onClick={() => router.push('/dashboard')} className="text-purple-600 dark:text-purple-400 hover:underline">Go to Dashboard</button></p>
          </div>
        </div>

        {/* Contract Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Contract Addresses:</p>
          <p className="font-mono mt-1">Dynasty: {CONTRACT_ADDRESSES.referralDynasty}</p>
        </div>
      </div>
    </div>
  );
}