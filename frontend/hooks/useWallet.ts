'use client';

import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useModal } from 'connectkit';  // Correct import - useModal, not useConnectModal
import { formatUnits } from 'viem';

export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { setOpen } = useModal();  // ConnectKit uses setOpen to control the modal

  const formatBalance = (): string => {
    if (!balance) return '0 STT';
    
    try {
      const formattedValue = formatUnits(balance.value, balance.decimals);
      const roundedValue = Number(formattedValue).toFixed(4);
      return `${roundedValue} ${balance.symbol}`;
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0 STT';
    }
  };

  const formatAddress = (): string => {
    if (!address) return '';
    try {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    } catch (error) {
      console.error('Error formatting address:', error);
      return '';
    }
  };

  const handleConnect = () => {
    setOpen(true);  // Open the ConnectKit modal
  };

  return {
    address,
    isConnected,
    chainName: chain?.name,
    chainId: chain?.id,
    balance: formatBalance(),
    shortAddress: formatAddress(),
    connect: handleConnect,
    disconnect,
    // Optional: expose modal control if needed
    openConnectModal: () => setOpen(true),
    rawBalance: balance,
  };
}