'use client';

import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useConnectModal } from '@connectkit';

export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const formatBalance = () => {
    if (!balance) return '0';
    return `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`;
  };

  const formatAddress = () => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    address,
    isConnected,
    chainName: chain?.name,
    balance: formatBalance(),
    shortAddress: formatAddress(),
    connect: openConnectModal,
    disconnect,
  };
}