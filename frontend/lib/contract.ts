import { ethers } from 'ethers';

// Contract Addresses - Keep these, they're the permanent contracts
export const CONTRACT_ADDRESSES = {
  userRegistry: process.env.NEXT_PUBLIC_USER_REGISTRY as `0x${string}`,
  referralDynasty: process.env.NEXT_PUBLIC_REFERRAL_DYNASTY as `0x${string}`,
  // referralBadge is removed from env - will be fetched from dynasty
};

// UserRegistry ABI
export const USER_REGISTRY_ABI = [
  "function register(address referrer) external",
  "function registerDirect() external",
  "function registered(address) view returns (bool)",
  "function referrers(address) view returns (address)",
  "event UserRegistered(address indexed newUser, address indexed referrer)"
];

// ReferralBadge ABI - Used after fetching address
export const REFERRAL_BADGE_ABI = [
  // Core functions
  "function mint(address user) external returns (uint256)",
  "function incrementReferral(address user) external",
  
  // View functions
  "function hasBadge(address) view returns (bool)",
  "function getUserBadge(address) view returns (tuple(uint8 tier, uint24 referralCount, uint256 lastUpdate))",
  "function userTokenId(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "function getBadge(uint256) view returns (tuple(uint8 tier, uint24 referralCount, uint256 lastUpdate))",
  "function totalBadges() view returns (uint256)",
  
  // Events
  "event BadgeMinted(address indexed user, uint256 indexed tokenId)",
  "event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 newCount)"
];

// ReferralDynasty ABI - Updated with badge() function
export const REFERRAL_DYNASTY_ABI = [
  // Core functions
  "function setTrustedEmitter(address emitter, bool trusted) external",
  "function pause() external",
  "function unpause() external",
  
  // View functions
  "function trustedEmitters(address) view returns (bool)",
  "function isTrustedEmitter(address) view returns (bool)",
  "function paused() view returns (bool)",
  "function badge() view returns (address)",
  "function totalReferrals() view returns (uint256)",
  
  // Events
  "event ReferralProcessed(address indexed referrer, address indexed newUser)",
  "event MintFailed(address indexed user, string reason)",
  "event EmitterTrustSet(address indexed emitter, bool trusted)",
  "event Paused(address indexed by)",
  "event Unpaused(address indexed by)",
  "event UntrustedEmitter(address indexed emitter)",
  "event TopicMismatch(bytes32 indexed received, bytes32 indexed expected)",
  
  // Helper function (useful for debugging)
  "function computeEventTopic(string calldata eventSignature) external pure returns (bytes32)"
];

export function getContract(provider: ethers.Provider | ethers.Signer, address: string, abi: any) {
  return new ethers.Contract(address, abi, provider);
}

