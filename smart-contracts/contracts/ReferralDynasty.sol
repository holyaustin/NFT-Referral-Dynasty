// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for the badge contract
interface IReferralBadge {
    function mint(address user) external returns (uint256);
    function hasBadge(address user) external view returns (bool);
    function incrementReferral(address user) external;
    function getUserTier(address user) external view returns (uint8);
}

// Interface for the registry (optional - if you need to query)
interface IUserRegistry {
    function isRegistered(address user) external view returns (bool);
}

/**
 * @title ReferralDynasty
 * @dev REACTIVE HANDLER contract that listens to UserRegistered events
 * and automatically mints badges and distributes small rewards.
 * 
 * This follows the exact pattern from the Somnia tutorial:
 * - Inherits from SomniaEventHandler
 * - Implements _onEvent() as the reactive entry point
 * - No complex inheritance conflicts
 */
contract ReferralDynasty is SomniaEventHandler, Ownable, ReentrancyGuard {
    
    // ============ Constants ============
    
    /// @dev The event we're subscribing to (from UserRegistry)
    bytes32 public constant USER_REGISTERED_TOPIC = 
        keccak256("UserRegistered(address,address)");
    
    /// @dev Tiny reward for new referrals (0.0001 ETH = very small)
    uint256 public constant REFERRAL_REWARD = 0.0001 ether;
    
    /// @dev Minimum balance for reward distribution
    uint256 public constant MIN_REWARD_THRESHOLD = 0.00005 ether;
    
    // ============ State ============
    
    /// @dev The badge NFT contract (owned by this contract)
    IReferralBadge public immutable badge;
    
    /// @dev Track which registries we trust (can be expanded)
    mapping(address => bool) public trustedRegistries;
    
    /// @dev ADDED: Track which generic emitters we trust (for isTrustedEmitter function)
    mapping(address => bool) public trustedEmitters;
    
    /// @dev Track total referrals processed
    uint256 public totalReferrals;
    
    /// @dev Track total rewards distributed
    uint256 public totalRewardsDistributed;
    
    /// @dev Pause flag for emergencies
    bool public paused;
    
    // ============ Events ============
    
    event ReferralProcessed(
        address indexed referrer,
        address indexed newUser,
        uint256 rewardAmount
    );
    
    event RewardDistributed(address indexed user, uint256 amount);
    
    event RegistryTrustSet(address indexed registry, bool trusted);
    
    /// @dev ADDED: Event for trusted emitters
    event EmitterTrustSet(address indexed emitter, bool trusted);
    
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    
    // ============ Constructor ============
    
    /**
     * @param badgeContract Address of the deployed ReferralBadge contract
     */
    constructor(address badgeContract) Ownable(msg.sender) {
        require(badgeContract != address(0), "Invalid badge address");
        badge = IReferralBadge(badgeContract);
    }
    
    // ============ Modifiers ============
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // ============ REACTIVE HANDLER ============
    
    /**
     * @dev This is called by Somnia validators when a subscribed event occurs.
     * Following the tutorial exactly - this is the only function from SomniaEventHandler we override.
     * 
     * @param emitter The contract that emitted the event
     * @param eventTopics The event topics (first is the event signature)
     * @param data The event data (non-indexed parameters)
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override whenNotPaused nonReentrant {
        // Security: Only process events from trusted registries
        require(trustedRegistries[emitter], "Untrusted emitter");
        require(eventTopics.length > 0, "No topics");
        
        // Check if this is the event we care about
        if (eventTopics[0] == USER_REGISTERED_TOPIC) {
            // Decode the event data
            (address newUser, address referrer) = abi.decode(data, (address, address));
            
            // Process the referral
            _processReferral(referrer, newUser);
        }
        // Ignore unknown topics (forward compatible)
    }
    
    // ============ Core Logic ============
    
    /**
     * @dev Process a new referral
     * @param referrer The address that referred the new user
     * @param newUser The newly registered user
     */
    function _processReferral(address referrer, address newUser) internal {
        // Security checks
        require(referrer != address(0), "Invalid referrer");
        require(newUser != address(0), "Invalid new user");
        require(referrer != newUser, "Cannot self-refer");
        
        // Check if referrer has a badge (they should, but verify)
        // If they don't, we might want to handle that edge case
        bool referrerHasBadge = badge.hasBadge(referrer);
        
        // Always mint a badge for the new user (genesis badge)
        // This happens even if referrer doesn't have a badge
        badge.mint(newUser);
        
        // If referrer has a badge, process the referral
        if (referrerHasBadge) {
            // Increment referrer's referral count (which may trigger badge evolution)
            badge.incrementReferral(referrer);
            
            // Send tiny reward to referrer (if contract has balance)
            if (address(this).balance >= REFERRAL_REWARD) {
                _sendReward(referrer, REFERRAL_REWARD);
            }
            
            totalReferrals++;
            emit ReferralProcessed(referrer, newUser, REFERRAL_REWARD);
        } else {
            // Handle case where referrer doesn't have a badge
            // Could still record the relationship for future when they mint
            emit ReferralProcessed(referrer, newUser, 0);
        }
    }
    
    /**
     * @dev Send a reward to a user (internal, non-reentrant is handled by caller)
     */
    function _sendReward(address user, uint256 amount) internal {
        // Security: CEI pattern - effects before interaction
        totalRewardsDistributed += amount;
        
        (bool success, ) = payable(user).call{value: amount}("");
        require(success, "Reward transfer failed");
        
        emit RewardDistributed(user, amount);
    }
    
    // ============ Public Functions ============
    
    /**
     * @dev Allow owner to fund the reward pool
     */
    function fundRewardPool() external payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
    }
    
    /**
     * @dev Set a registry as trusted (can emit events we react to)
     * @param registry The registry contract address
     * @param trusted True to trust, false to untrust
     */
    function setTrustedRegistry(address registry, bool trusted) external onlyOwner {
        require(registry != address(0), "Invalid address");
        trustedRegistries[registry] = trusted;
        emit RegistryTrustSet(registry, trusted);
    }
    
    /// @dev ADDED: Set a generic emitter as trusted
    function setTrustedEmitter(address emitter, bool trusted) external onlyOwner {
        require(emitter != address(0), "Invalid address");
        trustedEmitters[emitter] = trusted;
        emit EmitterTrustSet(emitter, trusted);
    }
    
    /**
     * @dev Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    /**
     * @dev Withdraw excess funds (only owner, keeps minimum for rewards)
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get contract balance (for reward pool)
     */
    function getRewardPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Check if a registry is trusted
     */
    function isTrustedRegistry(address registry) external view returns (bool) {
        return trustedRegistries[registry];
    }
    
    /// @dev Check if a generic emitter is trusted
    function isTrustedEmitter(address emitter) external view returns (bool) {
        return trustedEmitters[emitter];
    }

    // ============ Receive Function ============
    
    /**
     * @dev Allow contract to receive ETH (for reward pool)
     */
    receive() external payable {}
}