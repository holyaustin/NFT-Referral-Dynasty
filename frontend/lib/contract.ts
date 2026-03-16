import { ethers } from 'ethers';

// Contract Addresses
export const CONTRACT_ADDRESSES = {
  userRegistry: process.env.NEXT_PUBLIC_USER_REGISTRY as `0x${string}`,
  referralBadge: process.env.NEXT_PUBLIC_REFERRAL_BADGE as `0x${string}`,
  referralDynasty: process.env.NEXT_PUBLIC_REFERRAL_DYNASTY as `0x${string}`,
};

// UserRegistry ABI
export const USER_REGISTRY_ABI = [
  "function register(address referrer) external",
  "function registerDirect() external",
  "function registered(address) view returns (bool)",
  "function referrers(address) view returns (address)",
  "event UserRegistered(address indexed newUser, address indexed referrer)"
];

// ReferralBadge ABI
export const REFERRAL_BADGE_ABI = [
  "function hasBadge(address) view returns (bool)",
  "function getUserBadge(address) view returns (tuple(uint8 tier, uint24 referralCount, uint256 lastUpdate))",
  "function userTokenId(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "event BadgeMinted(address indexed user, uint256 indexed tokenId)",
  "event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 newCount)"
];

// ReferralDynasty ABI
export const REFERRAL_DYNASTY_ABI = [
  "function mintBadge() external payable returns (uint256)",
  "function setTrustedEmitter(address emitter, bool trusted) external",
  "function trustedEmitters(address) view returns (bool)",
  "function isTrustedEmitter(address) view returns (bool)",
  "function getRewardPoolBalance() view returns (uint256)",
  "function fundRewardPool() external payable",
  "function pause() external",
  "function unpause() external",
  "function paused() view returns (bool)",
  "event ReferralProcessed(address indexed referrer, address indexed newUser, uint256 rewardAmount)",
  "event RewardDistributed(address indexed user, uint256 amount)",
  "event RegistryTrustSet(address indexed registry, bool trusted)",
  "event EmitterTrustSet(address indexed emitter, bool trusted)"
];

export function getContract(provider: ethers.Provider | ethers.Signer, address: string, abi: any) {
  return new ethers.Contract(address, abi, provider);
}