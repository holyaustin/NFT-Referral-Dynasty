'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { CONTRACT_ADDRESSES, USER_REGISTRY_ABI } from '@/lib/contract';
import { ethers } from 'ethers';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ReferralFormProps {
  address: string;
  onSuccess?: () => void;
  redirectToDashboard?: boolean;
}

// Add this type declaration
declare global {
  interface Window {
    ethereum?: any;
  }
}

export function ReferralForm({ address, onSuccess, redirectToDashboard = true }: ReferralFormProps) {
  const [referrer, setReferrer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { isConnected } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const registry = new ethers.Contract(
        CONTRACT_ADDRESSES.userRegistry,
        USER_REGISTRY_ABI,
        signer
      );

      // Validate referrer address
      if (!ethers.isAddress(referrer)) {
        throw new Error('Invalid referrer address');
      }

      // Submit registration
      const tx = await registry.register(referrer);
      
      toast.loading('Registering...', { id: 'register' });
      await tx.wait();
      
      toast.success('Successfully registered!', { id: 'register' });
      
      if (onSuccess) {
        onSuccess();
      }
      
      setReferrer('');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
      toast.error('Registration failed', { id: 'register' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectRegister = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const registry = new ethers.Contract(
        CONTRACT_ADDRESSES.userRegistry,
        USER_REGISTRY_ABI,
        signer
      );

      const tx = await registry.registerDirect();
      
      toast.loading('Registering...', { id: 'register' });
      await tx.wait();
      
      toast.success('Successfully registered!', { id: 'register' });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
      toast.error('Registration failed', { id: 'register' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600 dark:text-gray-300">Connect wallet to register</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="referrer" className="block text-sm font-medium mb-2">
            Referrer Address (Optional)
          </label>
          <input
            type="text"
            id="referrer"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to register without a referrer
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <XCircleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registering...' : 'Register with Referrer'}
          </button>
          
          <button
            type="button"
            onClick={handleDirectRegister}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-purple-500 text-sm font-medium hover:bg-purple-500/10 transition-all duration-300 disabled:opacity-50"
          >
            Direct
          </button>
        </div>
      </form>

      {redirectToDashboard && (
        <p className="text-xs text-center text-gray-500">
          After registration, you'll be redirected to your dashboard
        </p>
      )}
    </div>
  );
}