// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";
import { ReferralBadge } from "./ReferralDynasty.sol";

/**
 * @title  ReferralBadgeTest
 * @notice Foundry unit + fuzz tests for ReferralBadge (standalone ERC721).
 *
 * Run:  forge test --match-contract ReferralBadgeTest -vvv
 */
contract ReferralBadgeTest is Test {

    ReferralBadge public badge;

    address public owner    = makeAddr("owner");
    address public alice    = makeAddr("alice");
    address public bob      = makeAddr("bob");
    address public attacker = makeAddr("attacker");

    // Mirror events from contract
    event BadgeMinted(address indexed user, uint256 indexed tokenId);
    event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 count);

    // ── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.prank(owner);
        badge = new ReferralBadge();
    }

    // ── Deployment ───────────────────────────────────────────────────────────

    function test_Deploy_Name() public view {
        assertEq(badge.name(), "Referral Dynasty");
    }

    function test_Deploy_Symbol() public view{
        assertEq(badge.symbol(), "RDYST");
    }

    function test_Deploy_Owner() public view{
        assertEq(badge.owner(), owner);
    }

    function test_Deploy_ZeroTotalBadges() public view {
        assertEq(badge.totalBadges(), 0);
    }

    // ── mint() ───────────────────────────────────────────────────────────────

    function test_Mint_Success() public {
        vm.expectEmit(true, true, false, false);
        emit BadgeMinted(alice, 1);

        vm.prank(owner);
        uint256 tokenId = badge.mint(alice);

        assertEq(tokenId, 1);
        assertTrue(badge.hasBadge(alice));
        assertEq(badge.userTokenId(alice), 1);
        assertEq(badge.ownerOf(1), alice);
        assertEq(badge.totalBadges(), 1);
    }

    function test_Mint_SequentialIds() public {
        vm.startPrank(owner);
        badge.mint(alice);
        uint256 t2 = badge.mint(bob);
        vm.stopPrank();
        assertEq(t2, 2);
    }

    function test_Mint_InitializesBadgeAtTier0() public {
        vm.prank(owner);
        uint256 id = badge.mint(alice);
        ReferralBadge.Badge memory b = badge.getBadge(id);
        assertEq(b.tier, 0);
        assertEq(b.referralCount, 0);
        assertGt(b.lastUpdate, 0);
    }

    function test_Mint_RevertDoubleMintsForSameUser() public {
        vm.startPrank(owner);
        badge.mint(alice);
        vm.expectRevert("Already have badge");
        badge.mint(alice);
        vm.stopPrank();
    }

    function test_Mint_RevertIfNotOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        badge.mint(alice);
    }

    // ── incrementReferral() ──────────────────────────────────────────────────

    function test_IncrementReferral_IncrementsCount() public {
        vm.startPrank(owner);
        uint256 id = badge.mint(alice);
        badge.incrementReferral(alice);
        vm.stopPrank();
        assertEq(badge.getBadge(id).referralCount, 1);
    }

    function test_IncrementReferral_RevertNoToken() public {
        vm.expectRevert("No badge");
        vm.prank(owner);
        badge.incrementReferral(alice);
    }

    function test_IncrementReferral_RevertIfNotOwner() public {
        vm.prank(owner);
        badge.mint(alice);
        vm.expectRevert();
        vm.prank(attacker);
        badge.incrementReferral(alice);
    }

    // ── Tier upgrades ────────────────────────────────────────────────────────

    function test_Tier_UpgradesToSilverAt5() public {
        vm.startPrank(owner);
        uint256 id = badge.mint(alice);
        for (uint i = 0; i < 4; i++) badge.incrementReferral(alice);

        vm.expectEmit(true, true, true, true);
        emit BadgeUpgraded(id, 1, 5);
        badge.incrementReferral(alice);
        vm.stopPrank();

        assertEq(badge.getBadge(id).tier, 1);
    }

    function test_Tier_UpgradesToGoldAt20() public {
        vm.startPrank(owner);
        uint256 id = badge.mint(alice);
        for (uint i = 0; i < 20; i++) badge.incrementReferral(alice);
        vm.stopPrank();
        assertEq(badge.getBadge(id).tier, 2);
    }

    function test_Tier_UpgradesToPlatinumAt50() public {
        vm.startPrank(owner);
        uint256 id = badge.mint(alice);
        for (uint i = 0; i < 50; i++) badge.incrementReferral(alice);
        vm.stopPrank();
        assertEq(badge.getBadge(id).tier, 3);
    }

    function test_Tier_DoesNotDowngrade() public {
        vm.startPrank(owner);
        uint256 id = badge.mint(alice);
        for (uint i = 0; i < 20; i++) badge.incrementReferral(alice);
        // still increments after gold — tier should stay at 2
        badge.incrementReferral(alice);
        vm.stopPrank();
        assertEq(badge.getBadge(id).tier, 2);
    }

    // ── tokenURI ─────────────────────────────────────────────────────────────

    function test_TokenURI_ReturnsCorrectFormat() public {
        vm.prank(owner);
        badge.mint(alice);
        assertEq(badge.tokenURI(1), "ipfs://QmBase/1.json");
    }

    function test_TokenURI_Token99() public {
        vm.startPrank(owner);
        for (uint160 i = 1; i <= 99; i++) badge.mint(address(i));
        vm.stopPrank();
        assertEq(badge.tokenURI(99), "ipfs://QmBase/99.json");
    }

    function test_TokenURI_RevertNonexistent() public {
        vm.expectRevert("Nonexistent");
        badge.tokenURI(999);
    }

    // ── getBadge ─────────────────────────────────────────────────────────────

    function test_GetBadge_RevertNonexistent() public {
        vm.expectRevert("Badge not found");
        badge.getBadge(999);
    }

    // ── ERC721 basics ────────────────────────────────────────────────────────

    function test_ERC721_BalanceAfterMint() public {
        vm.prank(owner);
        badge.mint(alice);
        assertEq(badge.balanceOf(alice), 1);
    }

    function test_ERC721_SupportsInterface_ERC165() public view{
        assertTrue(badge.supportsInterface(0x01ffc9a7));
    }

    function test_ERC721_SupportsInterface_ERC721() public view{
        assertTrue(badge.supportsInterface(0x80ac58cd));
    }

    // ── Ownership ────────────────────────────────────────────────────────────

    function test_Ownership_TransferWorks() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        badge.transferOwnership(newOwner);
        assertEq(badge.owner(), newOwner);
    }

    function test_Ownership_OnlyNewOwnerCanMint() public {
        address dynasty = makeAddr("dynasty");
        vm.prank(owner);
        badge.transferOwnership(dynasty);

        vm.expectRevert();
        vm.prank(owner); // old owner can no longer mint
        badge.mint(alice);

        vm.prank(dynasty);
        uint256 id = badge.mint(alice);
        assertEq(id, 1);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_IncrementReferral_TierNeverExceedsPlatinum(uint8 n) public {
        vm.startPrank(owner);
        uint256 id = badge.mint(alice);
        for (uint i = 0; i < n; i++) badge.incrementReferral(alice);
        vm.stopPrank();
        assertLe(badge.getBadge(id).tier, 3);
    }

    function testFuzz_Mint_UniqueTokenPerAddress(address a, address b) public {
        vm.assume(a != address(0) && b != address(0) && a != b);
        vm.assume(a.code.length == 0 && b.code.length == 0);
        vm.startPrank(owner);
        uint256 ta = badge.mint(a);
        uint256 tb = badge.mint(b);
        vm.stopPrank();
        assertTrue(ta != tb);
    }
}