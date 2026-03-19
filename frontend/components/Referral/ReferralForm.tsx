'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useBadgeData } from '@/hooks/useBadgeData';
import { CONTRACT_ADDRESSES, USER_REGISTRY_ABI, REFERRAL_BADGE_ABI, REFERRAL_DYNASTY_ABI } from '@/lib/contract';
import { ethers, BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ReferralFormProps {
  address: string;
  onSuccess?: () => void;
  redirectToDashboard?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: ENS resolution error
// ─────────────────────────────────────────────────────────────────────────────
// Root cause: ethers v6 JsonRpcProvider calls `network.getEnsAddress()` when
// resolving contract addresses if the network is not recognised (chainId 50312
// has no entry in ethers' built-in network list, so it returns `name: "unknown"`
// and `ensAddress: null`). The moment any Contract method is called, ethers
// tries to resolve the contract address through ENS and throws:
//   "network does not support ENS (operation="getEnsAddress" ...)"
//
// Fix A — pass an explicit Network object to JsonRpcProvider so ethers knows
// ENS is not available on this network and skips the resolution step entirely.
//
// Fix B — call ethers.getAddress() to checksum every address before passing it
// to a Contract constructor. A checksummed address is unambiguously an address,
// not an ENS name, so ethers never attempts ENS resolution for it.
//
// Both fixes are applied below. Either alone would stop the error, but both
// together make the intent explicit and guard against future address-format issues.
// ─────────────────────────────────────────────────────────────────────────────

const SOMNIA_NETWORK = {
  chainId: 50312,
  name: 'somniaTestnet',
};

// Fix A: pass the explicit Network object so ethers never attempts ENS.
const getReadOnlyProvider = () => {
  return new JsonRpcProvider(
    process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network',
    SOMNIA_NETWORK,
    { staticNetwork: true }   // prevents the provider re-fetching network on every call
  );
};

// Fix B: normalise any address string to a checksum address before use.
// ethers.getAddress() throws on invalid input, making bad addresses fail fast
// rather than silently triggering ENS resolution.
const toChecksumAddress = (addr: string): string => {
  return ethers.getAddress(addr);
};

export function ReferralForm({ address, onSuccess, redirectToDashboard = true, className = '' }: ReferralFormProps) {
  const [referrer, setReferrer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasBadge, setHasBadge] = useState(false);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{ hasBadge: boolean; isValid: boolean } | null>(null);
  const [badgeAddress, setBadgeAddress] = useState<string | null>(null);
  const { isConnected, connect } = useWallet();
  const { badge, refetch: refetchBadge } = useBadgeData(address);

  const getProvider = useCallback(() => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask or another Web3 wallet');
    }
    return new BrowserProvider(window.ethereum);
  }, []);

  // Fetch badge address from dynasty contract
  const fetchBadgeAddress = useCallback(async () => {
    try {
      const provider = getReadOnlyProvider();
      const dynastyContract = new Contract(
        toChecksumAddress(CONTRACT_ADDRESSES.referralDynasty), // Fix B
        REFERRAL_DYNASTY_ABI,
        provider
      );
      const addr = await dynastyContract.badge();
      console.log('Fetched badge address:', addr);
      // Store as checksum address so every downstream consumer is safe
      const checksummed = toChecksumAddress(addr);
      setBadgeAddress(checksummed);
      return checksummed;
    } catch (err) {
      console.error('Error fetching badge address:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchBadgeAddress();
  }, [fetchBadgeAddress]);

  // Check registration and badge status
  useEffect(() => {
    const checkRegistration = async () => {
      if (!address) return;

      try {
        const provider = getReadOnlyProvider();

        const registry = new Contract(
          toChecksumAddress(CONTRACT_ADDRESSES.userRegistry), // Fix B
          USER_REGISTRY_ABI,
          provider
        );

        // Fix B: checksum the user address so ethers treats it as an address
        // literal and never falls through to ENS resolution.
        const registered = await registry.registered(toChecksumAddress(address));
        console.log('Registration check for', address, ':', registered);
        setIsRegistered(registered);

        let currentBadgeAddress = badgeAddress;
        if (!currentBadgeAddress) {
          currentBadgeAddress = await fetchBadgeAddress();
        }

        if (currentBadgeAddress) {
          const badgeContract = new Contract(
            toChecksumAddress(currentBadgeAddress), // Fix B
            REFERRAL_BADGE_ABI,
            provider
          );
          const hasBadgeResult = await badgeContract.hasBadge(toChecksumAddress(address));
          console.log('Badge check for', address, ':', hasBadgeResult);
          setHasBadge(hasBadgeResult);
        }
      } catch (err) {
        console.error('Error checking registration:', err);
      }
    };

    checkRegistration();
  }, [address, badgeAddress, fetchBadgeAddress]);

  // Check referrer validity
  useEffect(() => {
    const checkReferrer = async () => {
      if (!referrer || referrer.length < 42) {
        setReferrerInfo(null);
        return;
      }

      setCheckingAddress(true);
      try {
        const provider = getReadOnlyProvider();

        if (!ethers.isAddress(referrer)) {
          setReferrerInfo({ hasBadge: false, isValid: false });
          return;
        }

        let currentBadgeAddress = badgeAddress;
        if (!currentBadgeAddress) {
          currentBadgeAddress = await fetchBadgeAddress();
        }

        if (currentBadgeAddress) {
          const badgeContract = new Contract(
            toChecksumAddress(currentBadgeAddress), // Fix B
            REFERRAL_BADGE_ABI,
            provider
          );
          const hasBadgeResult = await badgeContract.hasBadge(toChecksumAddress(referrer)); // Fix B
          setReferrerInfo({ hasBadge: hasBadgeResult, isValid: true });
        } else {
          setReferrerInfo({ hasBadge: false, isValid: true });
        }
      } catch (err) {
        console.error('Error checking referrer:', err);
        setReferrerInfo({ hasBadge: false, isValid: false });
      } finally {
        setCheckingAddress(false);
      }
    };

    checkReferrer();
  }, [referrer, badgeAddress, fetchBadgeAddress]);

  const validateAddress = (addr: string): boolean => {
    try {
      return ethers.isAddress(addr);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTxHash('');

    if (referrer) {
      if (!validateAddress(referrer)) {
        setError('Invalid referrer address format');
        return;
      }
      if (referrer.toLowerCase() === address.toLowerCase()) {
        setError('You cannot refer yourself');
        return;
      }
      if (!referrerInfo?.hasBadge) {
        setError('Referrer does not have a badge yet');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = getProvider();
      const signer = await provider.getSigner();

      const registry = new Contract(
        toChecksumAddress(CONTRACT_ADDRESSES.userRegistry), // Fix B
        USER_REGISTRY_ABI,
        signer
      );

      // Fix B: checksum address for the staticCall argument
      const isAlreadyRegistered = await registry.registered(toChecksumAddress(address));
      console.log('Pre-registration check:', isAlreadyRegistered);

      if (isAlreadyRegistered) {
        setIsRegistered(true);
        throw new Error('Address already registered');
      }

      let tx;
      if (referrer) {
        toast.loading('Registering with referrer...', { id: 'register' });
        console.log('Registering with referrer:', referrer);
        tx = await registry.register(toChecksumAddress(referrer)); // Fix B
      } else {
        toast.loading('Registering directly...', { id: 'register' });
        console.log('Registering directly');
        tx = await registry.registerDirect();
      }

      setTxHash(tx.hash);
      console.log('Transaction hash:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      if (receipt.status === 1) {
        toast.success('Registration successful! Your badge is being minted...', { id: 'register' });
        setIsRegistered(true);
        setCheckingStatus(true);

        let currentBadgeAddress = badgeAddress;
        if (!currentBadgeAddress) {
          currentBadgeAddress = await fetchBadgeAddress();
        }

        let attempts = 0;
        const maxAttempts = 30;

        const checkBadge = setInterval(async () => {
          attempts++;
          try {
            if (!currentBadgeAddress) {
              currentBadgeAddress = await fetchBadgeAddress();
            }

            if (currentBadgeAddress) {
              const readProvider = getReadOnlyProvider();
              const badgeContract = new Contract(
                toChecksumAddress(currentBadgeAddress), // Fix B
                REFERRAL_BADGE_ABI,
                readProvider
              );

              const hasBadgeNow = await badgeContract.hasBadge(toChecksumAddress(address)); // Fix B
              console.log('Badge check attempt', attempts, ':', hasBadgeNow);

              if (hasBadgeNow) {
                clearInterval(checkBadge);
                setHasBadge(true);
                setCheckingStatus(false);
                toast.success('Badge minted successfully!', { id: 'badge-check' });
                await refetchBadge();
                if (onSuccess) onSuccess();
              } else if (attempts >= maxAttempts) {
                clearInterval(checkBadge);
                setCheckingStatus(false);
                toast.success(
                  'Registration confirmed! Badge minting in progress (reactivity may take a moment)...',
                  { id: 'badge-check' }
                );
              }
            }
          } catch (err) {
            console.error('Error checking badge:', err);
          }
        }, 2000);

        setReferrer('');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);

      if (err.code === 4001 || err.message?.includes('user rejected')) {
        setError('Transaction rejected');
      } else if (err.message?.includes('already registered')) {
        setError('This address is already registered');
        setIsRegistered(true);

        try {
          let currentBadgeAddress = badgeAddress;
          if (!currentBadgeAddress) currentBadgeAddress = await fetchBadgeAddress();

          if (currentBadgeAddress) {
            const readProvider = getReadOnlyProvider();
            const badgeContract = new Contract(
              toChecksumAddress(currentBadgeAddress),
              REFERRAL_BADGE_ABI,
              readProvider
            );
            const hasBadgeResult = await badgeContract.hasBadge(toChecksumAddress(address));
            setHasBadge(hasBadgeResult);
          }
        } catch (badgeErr) {
          console.error('Error checking badge after registration error:', badgeErr);
        }
      } else if (err.message?.includes('insufficient funds')) {
        setError('Insufficient funds for transaction');
      } else if (err.message?.includes('nonce')) {
        setError('Transaction nonce error. Please try again.');
      } else {
        setError(err.message || 'Registration failed');
      }

      toast.error('Registration failed', { id: 'register' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectRegister = async () => {
    setReferrer('');
    const syntheticEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
    } as React.FormEvent;
    await handleSubmit(syntheticEvent);
  };

  // Already registered with badge
  if (isRegistered && hasBadge) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card p-6 text-center ${className}`}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <h3 className="text-xl font-bold gradient-text mb-2">Already Registered!</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          You're already part of the Referral Dynasty with a badge.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300"
          >
            Go to Dashboard
          </button>
          <p className="text-xs text-gray-500">
            Your badge tier: {badge ? ['Bronze', 'Silver', 'Gold', 'Platinum'][badge.tier] : 'Unknown'}
          </p>
        </div>
      </motion.div>
    );
  }

  // Registered but badge not yet minted
  if (isRegistered && !hasBadge) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card p-6 text-center ${className}`}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <ArrowPathIcon className="h-10 w-10 text-yellow-500 animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-bold gradient-text mb-2">Registration Confirmed!</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Your badge is being minted. This may take a few moments...
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          <span>Waiting for reactivity to process</span>
        </div>
      </motion.div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`glass-card p-6 text-center ${className}`}>
        <UserPlusIcon className="h-12 w-12 mx-auto text-purple-500 mb-4" />
        <h3 className="text-lg font-semibold gradient-text mb-2">Connect Wallet to Register</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Join the Referral Dynasty and start earning rewards
        </p>
        <button
          onClick={connect}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold gradient-text mb-4">Join Referral Dynasty</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="referrer" className="block text-sm font-medium mb-2">
            Referrer Address <span className="text-gray-500">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="referrer"
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              placeholder="0x..."
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                error ? 'border-red-500' :
                referrerInfo?.hasBadge ? 'border-green-500' :
                referrerInfo?.isValid === false ? 'border-red-500' :
                'border-purple-500/20'
              } focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm transition-all duration-300 pr-10`}
              disabled={isLoading || checkingStatus}
            />
            {checkingAddress && (
              <ArrowPathIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            )}
            {!checkingAddress && referrerInfo?.hasBadge && (
              <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {!checkingAddress && referrerInfo?.isValid === false && (
              <XCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
            )}
          </div>

          {referrer && !checkingAddress && (
            <div className="mt-2">
              {referrerInfo?.hasBadge ? (
                <p className="text-xs text-green-500">✓ Valid referrer with badge</p>
              ) : referrerInfo?.isValid === false ? (
                <p className="text-xs text-red-500">✗ Invalid address or no badge</p>
              ) : null}
            </div>
          )}

          <p className="mt-1 text-xs text-gray-500">
            Enter the address of your referrer (must have a badge)
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg"
            >
              <XCircleIcon className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {txHash && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs"
            >
              <p className="text-gray-500">Transaction:</p>
              <a
                href={`https://testnet-explorer.somnia.network/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-purple-600 dark:text-purple-400 hover:underline truncate block"
              >
                {txHash}
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {checkingStatus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400"
            >
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span>Waiting for badge minting (reactivity)...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading || checkingStatus || (!!referrer && !referrerInfo?.hasBadge)}
            className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-3 text-sm font-medium text-white hover:from-purple-700 hover:to-purple-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Registering...
              </span>
            ) : (
              'Register with Referrer'
            )}
          </button>

          <button
            type="button"
            onClick={handleDirectRegister}
            disabled={isLoading || checkingStatus}
            className="px-4 py-3 rounded-lg border border-purple-500 text-sm font-medium hover:bg-purple-500/10 transition-all duration-300 disabled:opacity-50"
          >
            Direct
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-purple-500/5 rounded-lg border border-purple-500/10">
        <h4 className="text-xs font-semibold gradient-text mb-2">How it works:</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Register with or without a referrer</li>
          <li>• Your genesis badge is minted automatically</li>
          <li>• Refer others to evolve your badge</li>
          <li>• Earn rewards from your referral network</li>
        </ul>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
          <span>Registration status: {isRegistered ? 'Registered' : 'Not registered'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasBadge ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
          <span>Badge status: {hasBadge ? 'Minted' : 'Not minted'}</span>
        </div>
      </div>
    </motion.div>
  );
}