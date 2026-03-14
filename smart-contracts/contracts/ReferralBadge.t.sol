// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";
import { ReferralBadge } from "../contracts/ReferralBadge.sol";

contract ReferralBadgeTest is Test {
    ReferralBadge public badge;
    
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    event BadgeMinted(address indexed user, uint256 indexed tokenId);
    event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 newCount);
    
    function setUp() public {
        vm.prank(owner);
        badge = new ReferralBadge();
    }
    
    function test_Mint() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit BadgeMinted(user1, 1);
        
        uint256 tokenId = badge.mint(user1);
        
        assertEq(tokenId, 1);
        assertTrue(badge.hasBadge(user1));
        assertEq(badge.userTokenId(user1), 1);
        assertEq(badge.ownerOf(1), user1);
        
        // FIXED: Get the struct first, then access its fields
        ReferralBadge.BadgeData memory badgeData = badge.getBadge(1);
        assertEq(badgeData.tier, 0);
        assertEq(badgeData.referralCount, 0);
        assertGt(badgeData.lastUpdate, 0);
    }
    
    function test_CannotMintTwice() public {
        vm.startPrank(owner);
        badge.mint(user1);
        
        vm.expectRevert("Already has badge");
        badge.mint(user1);
        vm.stopPrank();
    }
    
    function test_OnlyOwnerCanMint() public {
        vm.prank(user1);
        vm.expectRevert("Only dynasty can call");
        badge.mint(user2);
    }
    
    function test_IncrementReferral() public {
        vm.startPrank(owner);
        badge.mint(user1);
        
        // First increment
        badge.incrementReferral(user1);
        
        // FIXED: Get struct and access fields
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(user1);
        assertEq(badgeData.referralCount, 1);
        assertEq(badgeData.tier, 0); // Still bronze
        
        // 4 more increments (total 5) - should upgrade to Silver
        for(uint i = 0; i < 4; i++) {
            badge.incrementReferral(user1);
        }
        
        badgeData = badge.getUserBadge(user1);
        assertEq(badgeData.referralCount, 5);
        assertEq(badgeData.tier, 1); // Silver
        vm.stopPrank();
    }
    
    function test_UpgradeToGold() public {
        vm.startPrank(owner);
        badge.mint(user1);
        
        // 20 referrals -> Gold
        for(uint i = 0; i < 20; i++) {
            badge.incrementReferral(user1);
        }
        
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(user1);
        assertEq(badgeData.referralCount, 20);
        assertEq(badgeData.tier, 2); // Gold
        vm.stopPrank();
    }
    
    function test_UpgradeToPlatinum() public {
        vm.startPrank(owner);
        badge.mint(user1);
        
        // 50 referrals -> Platinum
        for(uint i = 0; i < 50; i++) {
            badge.incrementReferral(user1);
        }
        
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(user1);
        assertEq(badgeData.referralCount, 50);
        assertEq(badgeData.tier, 3); // Platinum
        vm.stopPrank();
    }
    
    function test_TokenURI() public {
        vm.prank(owner);
        badge.mint(user1);
        
        string memory uri = badge.tokenURI(1);
        assertEq(uri, "ipfs://QmBase/1.json");
    }
    
    // Fuzz test example
    function testFuzz_IncrementMultiple(uint8 increments) public {
        vm.assume(increments > 0 && increments < 100);
        
        vm.startPrank(owner);
        badge.mint(user1);
        
        for(uint i = 0; i < increments; i++) {
            badge.incrementReferral(user1);
        }
        
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(user1);
        assertEq(badgeData.referralCount, increments);
        
        uint8 expectedTier = 0;
        if (badgeData.referralCount >= 50) expectedTier = 3;
        else if (badgeData.referralCount >= 20) expectedTier = 2;
        else if (badgeData.referralCount >= 5) expectedTier = 1;
        
        assertEq(badgeData.tier, expectedTier);
        vm.stopPrank();
    }
}