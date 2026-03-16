'use client';

import { useWallet } from '@/hooks/useWallet';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export function NetworkStatus() {
  const { isConnected, chainName } = useWallet();

  return (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <span className="hidden sm:inline">Connected to {chainName || 'Somnia'}</span>
        </>
      ) : (
        <>
          <XCircleIcon className="h-5 w-5 text-red-500" />
          <span className="hidden sm:inline">Not Connected</span>
        </>
      )}
    </div>
  );
}