// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ReferralDynasty is SomniaEventHandler, ERC721, Ownable {
    
    // ============ CONSTANTS ============
    bytes32 public constant USER_REGISTERED_TOPIC = keccak256("UserRegistered(address,address)");
    bytes32 public constant TRADE_EXECUTED_TOPIC = keccak256("TradeExecuted(address,uint256)");
    
    uint256 public constant TIER_1_BASIS = 1000; // 10%
    uint256 public constant TIER_2_BASIS = 500;  // 5%
    uint256 public constant TIER_3_BASIS = 250;  // 2.5%
    uint256 public constant TIER_4_BASIS = 125;  // 1.25%
    uint256 public constant TIER_5_BASIS = 62;   // 0.625%
    
    // ============ DATA STRUCTURES ============
    
    struct User {
        address referrer;
        uint256 referralCount;
        uint256 tier;           // 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
        uint256 totalRewards;
        uint256[] downline;
        uint256 lastActive;
    }
    
    struct BadgeData {
        uint8 tier;
        uint24 referralCount;
        uint24 downlineCount;
        uint256 lastUpdate;
        string metadataURI;
    }
    
    // ============ STATE ============
    
    mapping(address => User) public users;
    mapping(uint256 => BadgeData) public badges;  // tokenId => BadgeData
    mapping(address => uint256) public userTokenId;
    mapping(address => bool) public hasMintedBadge;
    
    uint256 public totalBadgesMinted;
    uint256 public totalReferrals;
    uint256 public totalRewardsDistributed;
    
    // ============ EVENTS ============
    
    event BadgeMinted(address indexed user, uint256 indexed tokenId, uint8 tier);
    event ReferralRegistered(address indexed referrer, address indexed newUser);
    event RewardDistributed(address indexed user, uint256 amount, uint8 tierLevel);
    event BadgeEvolved(uint256 indexed tokenId, uint8 newTier, uint24 count);
    event TradeProcessed(address indexed user, uint256 amount);
    
    // ============ CONSTRUCTOR ============
    
    constructor() ERC721("Referral Dynasty", "RDYST") Ownable(msg.sender) {}
    
    // ============ REACTIVITY HANDLER ============
    
    /**
     * @dev Called by Somnia Reactivity precompile when subscribed events occur
     * This is the CORE of our reactive system
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        
        // CASE 1: New User Registered
        if (eventTopics[0] == USER_REGISTERED_TOPIC) {
            (address newUser, address referrer) = abi.decode(data, (address, address));
            _handleNewReferral(referrer, newUser);
        }
        
        // CASE 2: Referred User Made a Trade
        if (eventTopics[0] == TRADE_EXECUTED_TOPIC) {
            (address trader, uint256 amount) = abi.decode(data, (address, uint256));
            _handleReferredTrade(trader, amount);
        }
    }
    
    // ============ REFERRAL LOGIC ============
    
    function _handleNewReferral(address referrer, address newUser) internal {
        require(referrer != address(0), "Invalid referrer");
        require(newUser != address(0), "Invalid new user");
        require(users[newUser].referrer == address(0), "Already referred");
        
        // Register relationship
        users[newUser].referrer = referrer;
        users[referrer].downline.push(newUser);
        users[referrer].referralCount++;
        users[referrer].lastActive = block.timestamp;
        
        totalReferrals++;
        
        // Update badge if referrer has one
        if (userTokenId[referrer] != 0) {
            uint256 tokenId = userTokenId[referrer];
            BadgeData storage badge = badges[tokenId];
            badge.referralCount++;
            badge.downlineCount = uint24(users[referrer].downline.length);
            
            // Check for tier upgrade
            uint8 newTier = _calculateTier(badge.referralCount);
            if (newTier > badge.tier) {
                badge.tier = newTier;
                badge.lastUpdate = block.timestamp;
                
                // Emit for off-chain SDK to generate new art
                emit BadgeEvolved(tokenId, newTier, badge.referralCount);
            }
        }
        
        // Immediate reward for direct referral (if referrer has badge)
        if (userTokenId[referrer] != 0) {
            _distributeReward(referrer, 0.01 ether, 1);
        }
        
        emit ReferralRegistered(referrer, newUser);
    }
    
    function _handleReferredTrade(address trader, uint256 amount) internal {
        address current = users[trader].referrer;
        uint256 level = 1;
        
        // Cascade rewards UP the referral chain (5 levels max)
        while (current != address(0) && level <= 5) {
            uint256 reward = _calculateCascadeReward(amount, level);
            
            if (reward > 0 && userTokenId[current] != 0) {
                _distributeReward(current, reward, uint8(level));
            }
            
            current = users[current].referrer;
            level++;
        }
        
        emit TradeProcessed(trader, amount);
    }
    
    function _distributeReward(address user, uint256 amount, uint8 tierLevel) internal {
        users[user].totalRewards += amount;
        users[user].lastActive = block.timestamp;
        totalRewardsDistributed += amount;
        
        // Auto-transfer if above threshold (avoid dust)
        if (amount > 0.001 ether) {
            (bool sent,) = payable(user).call{value: amount}("");
            if (sent) {
                emit RewardDistributed(user, amount, tierLevel);
            }
        }
    }
    
    // ============ BADGE MINTING ============
    
    function mintBadge() external payable returns (uint256) {
        require(!hasMintedBadge[msg.sender], "Already minted");
        require(msg.value >= 0.01 ether, "Insufficient fee");
        
        totalBadgesMinted++;
        uint256 tokenId = totalBadgesMinted;
        
        _safeMint(msg.sender, tokenId);
        userTokenId[msg.sender] = tokenId;
        hasMintedBadge[msg.sender] = true;
        
        // Initialize badge data
        badges[tokenId] = BadgeData({
            tier: 0,
            referralCount: 0,
            downlineCount: 0,
            lastUpdate: block.timestamp,
            metadataURI: _generateBaseURI(tokenId)
        });
        
        emit BadgeMinted(msg.sender, tokenId, 0);
        
        return tokenId;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getReferralCount(address user) external view returns (uint256) {
        return users[user].referralCount;
    }
    
    function getDownline(address user) external view returns (uint256[] memory) {
        return users[user].downline;
    }
    
    function getBadgeData(uint256 tokenId) external view returns (BadgeData memory) {
        return badges[tokenId];
    }
    
    function getTopReferrers(uint256 limit) external view returns (address[] memory) {
        // This is simplified - in production you'd want a more efficient approach
        address[] memory result = new address[](limit);
        // Implementation would sort by referralCount
        return result;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _calculateTier(uint256 count) internal pure returns (uint8) {
        if (count >= 50) return 3;  // Platinum
        if (count >= 20) return 2;  // Gold
        if (count >= 5) return 1;   // Silver
        return 0;                    // Bronze
    }
    
    function _calculateCascadeReward(uint256 amount, uint256 level) internal pure returns (uint256) {
        uint256 basisPoints;
        
        if (level == 1) basisPoints = TIER_1_BASIS;
        else if (level == 2) basisPoints = TIER_2_BASIS;
        else if (level == 3) basisPoints = TIER_3_BASIS;
        else if (level == 4) basisPoints = TIER_4_BASIS;
        else if (level == 5) basisPoints = TIER_5_BASIS;
        else return 0;
        
        return (amount * basisPoints) / 10000;
    }
    
    function _generateBaseURI(uint256 tokenId) internal pure returns (string memory) {
        return string(abi.encodePacked("ipfs://base/", uint2str(tokenId), ".json"));
    }
    
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    // ============ OWNER FUNCTIONS ============
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Override required by Solidity
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, SomniaEventHandler) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}