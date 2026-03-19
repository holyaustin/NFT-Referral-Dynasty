// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";
import { UserRegistry } from "../contracts/UserRegistry.sol";
import { ReferralBadge } from "../contracts/ReferralBadge.sol";
import { TestableDynasty } from "../contracts/test/TestableDynasty.sol";

contract ReferralDynastyTest is Test {
    UserRegistry public registry;
    ReferralBadge public badge;
    TestableDynasty public dynasty;
    
    address public owner = address(0x1);
    address public referrer = address(0x2);
    address public newUser = address(0x3);
    address public other = address(0x4);
    
    bytes32 constant USER_REGISTERED_TOPIC = keccak256("UserRegistered(address,address)");
    
    event ReferralProcessed(address indexed referrer, address indexed newUser, uint256 rewardAmount);
    event RewardDistributed(address indexed user, uint256 amount);
    event RegistryTrustSet(address indexed registry, bool trusted);
    event EmitterTrustSet(address indexed emitter, bool trusted);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        registry = new UserRegistry();
        badge = new ReferralBadge();
        dynasty = new TestableDynasty(address(badge));
        
        // Transfer badge ownership to dynasty
        badge.transferOwnership(address(dynasty));
        
        // Set registry as trusted using both functions
        //dynasty.setTrustedRegistry(address(registry), true);
        dynasty.setTrustedEmitter(address(registry), true);
        
        vm.stopPrank();
        
        // Fund the dynasty contract (for rewards)
        vm.deal(address(dynasty), 1 ether);
    }
    
    function test_Setup() public view {
        assertEq(dynasty.owner(), owner);
        assertEq(badge.owner(), address(dynasty));
        //assertTrue(dynasty.trustedRegistries(address(registry)));
        assertTrue(dynasty.trustedEmitters(address(registry)));
    }
    
    // Note: Users don't mint badges directly. Badges are minted automatically
    // when users register through the UserRegistry, which triggers the reactive handler.
    
    function test_UserRegistrationMintsBadge() public {
        // User registers through registry (which will trigger reactive handler)
        vm.prank(newUser);
        registry.register(referrer);
        
        // The reactive handler should have minted a badge for newUser
        assertTrue(badge.hasBadge(newUser));
        assertTrue(badge.ownerOf(1) == newUser);
    }
    
    function test_ReferrerGetsReward() public {
        // First, referrer needs to have a badge (they must have registered earlier)
        vm.prank(referrer);
        registry.register(other); // This mints a badge for referrer
        
        // Now new user registers with referrer
        vm.prank(newUser);
        registry.register(referrer);
        
        // Check referrer's badge was updated
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(referrer);
        assertEq(badgeData.referralCount, 1);
    }
    
    function test_ProcessReferral() public {
        // Give referrer a badge by having them register
        vm.prank(referrer);
        registry.register(other);
        
        // Simulate UserRegistered event directly through expose_onEvent
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = USER_REGISTERED_TOPIC;
        
        bytes memory data = abi.encode(newUser, referrer);
        
        vm.prank(address(registry));
        dynasty.expose_onEvent(address(registry), topics, data);
        
        // Check new user got badge
        assertTrue(badge.hasBadge(newUser));
        
        // Check referrer's count increased
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(referrer);
        assertEq(badgeData.referralCount, 1);
    }
    
    function test_ProcessReferral_RevertUntrustedEmitter() public {
        // Give referrer a badge
        vm.prank(referrer);
        registry.register(other);
        
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = USER_REGISTERED_TOPIC;
        bytes memory data = abi.encode(newUser, referrer);
        
        // Try to call from untrusted address
        vm.prank(other);
        vm.expectRevert("Untrusted emitter");
        dynasty.expose_onEvent(other, topics, data);
    }
    
    function test_HandleReferrerWithoutBadge() public {
        // Referrer has NO badge (never registered)
        
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = USER_REGISTERED_TOPIC;
        bytes memory data = abi.encode(newUser, referrer);
        
        vm.prank(address(registry));
        dynasty.expose_onEvent(address(registry), topics, data);
        
        // New user should still get badge
        assertTrue(badge.hasBadge(newUser));
        
        // Referrer should still have no badge
        assertFalse(badge.hasBadge(referrer));
    }
    
    function test_SetTrustedRegistry() public {
        vm.prank(owner);
        // dynasty.setTrustedRegistry(other, true);
        
        //assertTrue(dynasty.trustedRegistries(other));
        
        vm.expectEmit(true, true, false, true);
        emit RegistryTrustSet(other, true);
    }
    
    function test_SetTrustedEmitter() public {
        vm.prank(owner);
        dynasty.setTrustedEmitter(other, true);
        
        assertTrue(dynasty.trustedEmitters(other));
        
        vm.expectEmit(true, true, false, true);
        emit EmitterTrustSet(other, true);
    }
    
    function test_SetTrustedRegistry_RevertNonOwner() public {
        vm.prank(referrer);
        vm.expectRevert();
        //dynasty.setTrustedRegistry(other, true);
    }
    
    function test_FundRewardPool() public {
        uint256 amount = 0.5 ether;
        uint256 beforeBalance = address(dynasty).balance;
        
        vm.prank(owner);
        //dynasty.fundRewardPool{value: amount}();
        
        assertEq(address(dynasty).balance, beforeBalance + amount);
    }
    
    function test_Pause() public {
        vm.prank(owner);
        dynasty.pause();
        
        assertTrue(dynasty.paused());
        
        vm.prank(owner);
        dynasty.unpause();
        
        assertFalse(dynasty.paused());
    }
    
    function test_Withdraw() public {
        uint256 withdrawAmount = 0.5 ether;
        uint256 beforeBalance = owner.balance;
        uint256 contractBefore = address(dynasty).balance;
        
        vm.prank(owner);
        //dynasty.withdraw(withdrawAmount);
        
        assertEq(address(dynasty).balance, contractBefore - withdrawAmount);
        assertGt(owner.balance, beforeBalance);
    }
    
    function test_Withdraw_RevertNonOwner() public {
        vm.prank(referrer);
        vm.expectRevert();
        //dynasty.withdraw(0.1 ether);
    }
    
    // Fuzz test example
    function testFuzz_ProcessMultipleReferrals(uint8 referralCount) public {
        vm.assume(referralCount > 0 && referralCount < 10);
        
        // Give referrer a badge
        vm.prank(referrer);
        registry.register(other);
        
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = USER_REGISTERED_TOPIC;
        
        for(uint i = 0; i < referralCount; i++) {
            address newUserAddr = address(uint160(uint256(keccak256(abi.encodePacked(i)))));
            vm.deal(newUserAddr, 1 ether);
            
            bytes memory data = abi.encode(newUserAddr, referrer);
            
            vm.prank(address(registry));
            dynasty.expose_onEvent(address(registry), topics, data);
            
            assertTrue(badge.hasBadge(newUserAddr));
        }
        
        ReferralBadge.BadgeData memory badgeData = badge.getUserBadge(referrer);
        assertEq(badgeData.referralCount, referralCount);
    }
}