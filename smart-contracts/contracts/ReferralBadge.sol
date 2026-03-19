// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ReferralBadge
 * @dev Pure ERC721 NFT that stores badge tier and referral count.
 * MODIFIERS REMOVED - Only the onlyDynasty modifier is removed.
 * All require statements preserved including hasBadge check.
 */
contract ReferralBadge is ERC721, Ownable {
    using Strings for uint256;
    
    // ============ Constants ============
    
    uint256 private constant SILVER_THRESHOLD = 2;
    uint256 private constant GOLD_THRESHOLD = 5;
    uint256 private constant PLATINUM_THRESHOLD = 20;
    
    string private constant BASE_URI = "ipfs://QmBase/";
    
    // ============ Structs ============
    
    struct BadgeData {
        uint8 tier;           // 0: Bronze, 1: Silver, 2: Gold, 3: Platinum
        uint24 referralCount; // Max ~16M referrals, more than enough
        uint256 lastUpdate;   // Timestamp of last evolution
    }
    
    // ============ State ============
    
    /// @dev tokenId => BadgeData
    mapping(uint256 => BadgeData) public badges;
    
    /// @dev user address => tokenId
    mapping(address => uint256) public userTokenId;
    
    /// @dev user address => has badge flag
    mapping(address => bool) public hasBadge;
    
    /// @dev Total badges minted (used as next tokenId)
    uint256 public totalBadges;
    
    // ============ Events ============
    
    event BadgeMinted(address indexed user, uint256 indexed tokenId);
    event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 newCount);
    
    // ============ Constructor ============
    
    constructor() ERC721("Referral Dynasty", "RDYST") Ownable(msg.sender) {}
    
    // ============ Core Functions ============
    
    /**
     * @dev Mint a new badge for a user
     * @param user Address to mint badge to
     * @return tokenId The ID of the newly minted badge
     * 
     * MODIFIER REMOVED - onlyDynasty removed, but hasBadge check preserved
     */
    function mint(address user) external returns (uint256) {
        // This require is preserved - prevents double minting
        require(!hasBadge[user], "User already has a badge");
        
        unchecked { totalBadges++; }
        uint256 tokenId = totalBadges;
        
        // Mint the NFT
        _safeMint(user, tokenId);
        
        // Update mappings
        hasBadge[user] = true;
        userTokenId[user] = tokenId;
        
        // Initialize badge data
        badges[tokenId] = BadgeData({
            tier: 0,
            referralCount: 0,
            lastUpdate: block.timestamp
        });
        
        emit BadgeMinted(user, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Increment referral count for a user's badge
     * @param user Address whose badge to update
     * 
     * MODIFIER REMOVED - onlyDynasty removed
     */
    function incrementReferral(address user) external {
        uint256 tokenId = userTokenId[user];
        require(tokenId != 0, "User does not have a badge");
        
        BadgeData storage badge = badges[tokenId];
        
        // Increment count (unchecked safe as max 16M)
        unchecked { badge.referralCount++; }
        
        // Check for tier upgrade
        uint8 newTier = _calculateTier(badge.referralCount);
        if (newTier > badge.tier) {
            badge.tier = newTier;
            badge.lastUpdate = block.timestamp;
            emit BadgeUpgraded(tokenId, newTier, badge.referralCount);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get badge data for a token ID
     * @param tokenId The token ID to query
     * @return BadgeData struct
     */
    function getBadge(uint256 tokenId) external view returns (BadgeData memory) {
        require(_ownerOf(tokenId) != address(0), "Badge does not exist");
        return badges[tokenId];
    }
    
    /**
     * @dev Get badge data for a user address
     * @param user The user address
     * @return BadgeData struct
     */
    function getUserBadge(address user) external view returns (BadgeData memory) {
        uint256 tokenId = userTokenId[user];
        require(tokenId != 0, "User has no badge");
        return badges[tokenId];
    }
    
    /**
     * @dev Get current tier for a user
     * @param user The user address
     * @return uint8 Current tier
     */
    function getUserTier(address user) external view returns (uint8) {
        uint256 tokenId = userTokenId[user];
        if (tokenId == 0) return 0;
        return badges[tokenId].tier;
    }
    
    /**
     * @dev Get referral count for a user
     * @param user The user address
     * @return uint24 Current referral count
     */
    function getUserReferralCount(address user) external view returns (uint24) {
        uint256 tokenId = userTokenId[user];
        if (tokenId == 0) return 0;
        return badges[tokenId].referralCount;
    }
    
    /**
     * @dev Returns the token URI for a given token ID
     * @param tokenId The token ID
     * @return string URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        return string(abi.encodePacked(BASE_URI, tokenId.toString(), ".json"));
    }
    
    // ============ Internal Helpers ============
    
    /**
     * @dev Calculate tier based on referral count
     * @param count The referral count
     * @return uint8 The tier (0-3)
     */
    function _calculateTier(uint24 count) internal pure returns (uint8) {
        if (count >= PLATINUM_THRESHOLD) return 3;
        if (count >= GOLD_THRESHOLD) return 2;
        if (count >= SILVER_THRESHOLD) return 1;
        return 0;
    }
}