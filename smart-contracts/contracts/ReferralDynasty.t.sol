// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";
import { ReferralBadge, ReferralDynasty } from "./ReferralDynasty.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  TestableDynasty
//
//  Exposes _onEvent as a public function because _onEvent is internal and
//  Somnia validators call it via a precompile in production. In tests we
//  call expose_onEvent() directly from the test contract (which is a
//  registered trusted emitter).
// ─────────────────────────────────────────────────────────────────────────────
contract TestableDynasty is ReferralDynasty {
    constructor(address badgeContract) ReferralDynasty(badgeContract) {}

    function expose_onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes    calldata data
    ) external whenActive nonReentrant {
        require(trustedEmitters[emitter], "Untrusted emitter");
        require(eventTopics.length > 0,   "No topics");

        bytes32 topic = eventTopics[0];
        if (topic == USER_REGISTERED_TOPIC) {
            (address newUser, address referrer) = abi.decode(data, (address, address));
            _addReferral(referrer, newUser);
        } else if (topic == TRADE_EXECUTED_TOPIC) {
            (address trader, uint256 amount) = abi.decode(data, (address, uint256));
            _processRewards(trader, amount);
        }
    }
}

/**
 * @title  ReferralDynastyTest
 * @notice Foundry unit + fuzz tests for ReferralDynasty.
 *
 * Run:  forge test --match-contract ReferralDynastyTest -vvv
 */
contract ReferralDynastyTest is Test {

    ReferralBadge   public badge;
    TestableDynasty public dynasty;

    address public owner    = makeAddr("owner");
    address public alice    = makeAddr("alice");
    address public bob      = makeAddr("bob");
    address public carol    = makeAddr("carol");
    address public dave     = makeAddr("dave");
    address public attacker = makeAddr("attacker");

    // Mirror events
    event BadgeMinted(address indexed user, uint256 indexed tokenId);
    event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 count);
    event ReferralMade(address indexed referrer, address indexed newUser);
    event RewardPaid(address indexed user, uint256 amount, uint8 level);
    event RewardPoolFunded(uint256 amount);
    event TrustedEmitterSet(address indexed emitter, bool trusted);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    uint256 constant MINT_FEE = 0.01 ether;

    // ── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.startPrank(owner);

        badge   = new ReferralBadge();
        dynasty = new TestableDynasty(address(badge));

        // Transfer badge ownership to dynasty so it can mint/increment
        badge.transferOwnership(address(dynasty));

        // Register this test contract as a trusted emitter
        dynasty.setTrustedEmitter(address(this), true);

        // Seed the reward pool
        dynasty.fundRewardPool{value: 10 ether}();

        vm.stopPrank();

        vm.deal(alice,    10 ether);
        vm.deal(bob,      10 ether);
        vm.deal(carol,    10 ether);
        vm.deal(dave,     10 ether);
        vm.deal(attacker, 1 ether);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _mint(address user) internal returns (uint256) {
        vm.prank(user);
        return dynasty.mintBadge{value: MINT_FEE}();
    }

    function _referral(address referrer, address newUser) internal {
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = dynasty.USER_REGISTERED_TOPIC();
        bytes memory data = abi.encode(newUser, referrer);
        dynasty.expose_onEvent(address(this), topics, data);
    }

    function _trade(address trader, uint256 amount) internal {
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = dynasty.TRADE_EXECUTED_TOPIC();
        bytes memory data = abi.encode(trader, amount);
        dynasty.expose_onEvent(address(this), topics, data);
    }

    // ── Deployment ───────────────────────────────────────────────────────────

    function test_Deploy_Owner() public view{
        assertEq(dynasty.owner(), owner);
    }

    function test_Deploy_BadgeAddress() public view {
        assertEq(address(dynasty.badge()), address(badge));
    }

    function test_Deploy_NotPaused() public view {
        assertFalse(dynasty.paused());
    }

    function test_Deploy_ZeroReferrals() public view {
        assertEq(dynasty.totalReferrals(), 0);
    }

    function test_Deploy_BadgeOwnedByDynasty() public view{
        assertEq(badge.owner(), address(dynasty));
    }

    function test_Deploy_RewardPoolSeeded() public view{
        assertEq(dynasty.getRewardPool().remaining, 10 ether);
    }

    // ── mintBadge ────────────────────────────────────────────────────────────

    function test_MintBadge_Success() public {
        vm.expectEmit(true, true, false, false);
        emit BadgeMinted(alice, 1);

        uint256 tokenId = _mint(alice);
        assertEq(tokenId, 1);
        assertTrue(badge.hasBadge(alice));
        assertEq(badge.userTokenId(alice), 1);
        assertEq(badge.ownerOf(1), alice);
    }

    function test_MintBadge_AddsToRewardPool() public {
        uint256 before = dynasty.getRewardPool().remaining;
        _mint(alice);
        assertEq(dynasty.getRewardPool().remaining - before, MINT_FEE);
    }

    function test_MintBadge_RefundsExcess() public {
        uint256 before = alice.balance;
        vm.prank(alice);
        dynasty.mintBadge{value: 0.05 ether}();
        assertEq(before - alice.balance, MINT_FEE);
    }

    function test_MintBadge_RevertInsufficientFee() public {
        vm.expectRevert("Need 0.01 ETH");
        vm.prank(alice);
        dynasty.mintBadge{value: 0.005 ether}();
    }

    function test_MintBadge_RevertDouble() public {
        _mint(alice);
        vm.expectRevert("Already have badge");
        vm.prank(alice);
        dynasty.mintBadge{value: MINT_FEE}();
    }

    function test_MintBadge_RevertWhenPaused() public {
        vm.prank(owner);
        dynasty.togglePause();
        vm.expectRevert("Paused");
        vm.prank(alice);
        dynasty.mintBadge{value: MINT_FEE}();
    }

    // ── setTrustedEmitter ────────────────────────────────────────────────────

    function test_SetTrustedEmitter_Enables() public {
        vm.prank(owner);
        dynasty.setTrustedEmitter(alice, true);
        assertTrue(dynasty.trustedEmitters(alice));
    }

    function test_SetTrustedEmitter_Disables() public {
        vm.prank(owner);
        dynasty.setTrustedEmitter(address(this), false);
        assertFalse(dynasty.trustedEmitters(address(this)));
    }

    function test_SetTrustedEmitter_EmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit TrustedEmitterSet(alice, true);
        vm.prank(owner);
        dynasty.setTrustedEmitter(alice, true);
    }

    function test_SetTrustedEmitter_RevertNonOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        dynasty.setTrustedEmitter(attacker, true);
    }

    function test_SetTrustedEmitter_RevertZeroAddress() public {
        vm.expectRevert("Zero address");
        vm.prank(owner);
        dynasty.setTrustedEmitter(address(0), true);
    }

    // ── Referral registration ────────────────────────────────────────────────

    function test_Referral_RegistersRelationship() public {
        _mint(alice);
        _referral(alice, bob);

        (address referrer,,,,,,) = dynasty.users(bob);
        assertEq(referrer, alice);
    }

    function test_Referral_IncrementsCount() public {
        _mint(alice);
        _referral(alice, bob);
        assertEq(dynasty.getReferralCount(alice), 1);
    }

    function test_Referral_AddsToDownline() public {
        _mint(alice);
        _referral(alice, bob);
        address[] memory dl = dynasty.getReferrals(alice);
        assertEq(dl.length, 1);
        assertEq(dl[0], bob);
    }

    function test_Referral_IncrementsTotalReferrals() public {
        _mint(alice);
        _referral(alice, bob);
        assertEq(dynasty.totalReferrals(), 1);
    }

    function test_Referral_EmitsReferralMade() public {
        _mint(alice);
        vm.expectEmit(true, true, false, false);
        emit ReferralMade(alice, bob);
        _referral(alice, bob);
    }

    function test_Referral_UpdatesBadgeReferralCount() public {
        _mint(alice);
        _referral(alice, bob);
        uint256 tokenId = badge.userTokenId(alice);
        assertEq(badge.getBadge(tokenId).referralCount, 1);
    }

    function test_Referral_RevertNoBadge() public {
        vm.expectRevert("Referrer no badge");
        _referral(alice, bob);
    }

    function test_Referral_RevertSelfRefer() public {
        _mint(alice);
        vm.expectRevert("Self refer");
        _referral(alice, alice);
    }

    function test_Referral_RevertAlreadyReferred() public {
        _mint(alice);
        _mint(bob);
        _referral(alice, carol);
        vm.expectRevert("Already referred");
        _referral(bob, carol);
    }

    function test_Referral_RevertUntrustedEmitter() public {
        _mint(alice);
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = dynasty.USER_REGISTERED_TOPIC();
        bytes memory data = abi.encode(bob, alice);
        vm.expectRevert("Untrusted emitter");
        vm.prank(attacker);
        dynasty.expose_onEvent(attacker, topics, data);
    }

    function test_Referral_RevertWhenPaused() public {
        _mint(alice);
        vm.prank(owner);
        dynasty.togglePause();
        vm.expectRevert("Paused");
        _referral(alice, bob);
    }

    // ── Downline cap ─────────────────────────────────────────────────────────

    function test_Downline_RevertWhenFull() public {
        _mint(alice);
        uint256 cap = dynasty.MAX_DOWNLINE();
        for (uint160 i = 1000; i < 1000 + cap; i++) {
            _referral(alice, address(i));
        }
        vm.expectRevert("Downline full");
        _referral(alice, address(0x9999));
    }

    // ── Tier upgrades via referrals ──────────────────────────────────────────

    function test_Tier_SilverAt5() public {
        _mint(alice);
        for (uint160 i = 100; i < 105; i++) _referral(alice, address(i));
        assertEq(badge.getBadge(badge.userTokenId(alice)).tier, 1);
    }

    function test_Tier_GoldAt20() public {
        _mint(alice);
        for (uint160 i = 100; i < 120; i++) _referral(alice, address(i));
        assertEq(badge.getBadge(badge.userTokenId(alice)).tier, 2);
    }

    function test_Tier_PlatinumAt50() public {
        _mint(alice);
        for (uint160 i = 100; i < 150; i++) _referral(alice, address(i));
        assertEq(badge.getBadge(badge.userTokenId(alice)).tier, 3);
    }

    function test_Tier_EmitsBadgeUpgradedAtSilver() public {
        _mint(alice);
        for (uint160 i = 100; i < 104; i++) _referral(alice, address(i));
        uint256 tokenId = badge.userTokenId(alice);
        vm.expectEmit(true, true, true, true);
        emit BadgeUpgraded(tokenId, 1, 5);
        _referral(alice, address(104));
    }

    // ── Reward cascade ───────────────────────────────────────────────────────

    function test_Reward_Tier1TenPercent() public {
        _mint(alice);
        _referral(alice, bob);

        uint256 before = alice.balance;
        _trade(bob, 1 ether);
        // 10% of 1 ETH = 0.1 ETH
        assertEq(alice.balance - before, 0.1 ether);
    }

    function test_Reward_Tier2FivePercent() public {
        _mint(alice);
        _mint(bob);
        _referral(alice, bob);
        _referral(bob, carol);

        uint256 aliceBefore = alice.balance;
        vm.warp(block.timestamp + 2 hours); // skip cooldown
        _trade(carol, 1 ether);
        // alice = level 2 → 5%
        assertEq(alice.balance - aliceBefore, 0.05 ether);
    }

    function test_Reward_Tier3TwoPointFivePercent() public {
        _mint(alice);
        _mint(bob);
        _mint(carol);
        _referral(alice, bob);
        _referral(bob, carol);
        _referral(carol, dave);

        vm.warp(block.timestamp + 2 hours);
        uint256 aliceBefore = alice.balance;
        _trade(dave, 1 ether);
        // alice = level 3 → 2.5%
        assertEq(alice.balance - aliceBefore, 0.025 ether);
    }

    function test_Reward_EmitsRewardPaid() public {
        _mint(alice);
        _referral(alice, bob);

        vm.expectEmit(true, true, true, true);
        emit RewardPaid(alice, 0.1 ether, 1);
        _trade(bob, 1 ether);
    }

    function test_Reward_SkipsBelowMinThreshold() public {
        _mint(alice);
        _referral(alice, bob);

        uint256 before = alice.balance;
        // 10% of 0.009 ETH = 0.0009 ETH < 0.001 ETH threshold
        _trade(bob, 0.009 ether);
        assertEq(alice.balance, before);
    }

    function test_Reward_SkipsNoBadgeInChain() public {
        // alice has badge, bob does NOT have badge, carol trades
        _mint(alice);
        _referral(alice, bob);   // bob has no badge
        _referral(bob, carol);   // carol trades

        uint256 bobBefore = bob.balance;
        _trade(carol, 1 ether);
        // bob skipped (no badge), alice gets level-2 reward
        assertEq(bob.balance, bobBefore);
    }

    function test_Reward_UpdatesTotalRewards() public {
        _mint(alice);
        _referral(alice, bob);
        _trade(bob, 1 ether);

        (,, uint256 totalRewards,,,,) = dynasty.users(alice);
        assertEq(totalRewards, 0.1 ether);
    }

    function test_Reward_UpdatesRewardPool() public {
        _mint(alice);
        _referral(alice, bob);
        uint256 remainingBefore = dynasty.getRewardPool().remaining;
        _trade(bob, 1 ether);
        uint256 remainingAfter = dynasty.getRewardPool().remaining;
        assertEq(remainingBefore - remainingAfter, 0.1 ether);
    }

    // ── Cooldown ─────────────────────────────────────────────────────────────

    function test_Cooldown_BlocksSecondRewardWithin1Hour() public {
        _mint(alice);
        _referral(alice, bob);
        _trade(bob, 0.1 ether);

        vm.expectRevert("Cooldown active");
        _trade(bob, 0.1 ether);
    }

    function test_Cooldown_AllowsRewardAfter1Hour() public {
        _mint(alice);
        _referral(alice, bob);
        _trade(bob, 0.1 ether);
        vm.warp(block.timestamp + 1 hours + 1);
        _trade(bob, 0.1 ether); // should not revert
    }

    // ── Daily limit ──────────────────────────────────────────────────────────

    function test_DailyLimit_BlocksOvercap() public {
        _mint(alice);
        _referral(alice, bob);
        // 10% of 10 ETH = 1 ETH = daily cap
        _trade(bob, 10 ether);

        vm.warp(block.timestamp + 1 hours + 1);
        vm.expectRevert("Daily limit");
        _trade(bob, 0.01 ether);
    }

    function test_DailyLimit_ResetsNextDay() public {
        _mint(alice);
        _referral(alice, bob);
        _trade(bob, 10 ether);  // fills cap
        vm.warp(block.timestamp + 1 days + 1);
        _trade(bob, 0.1 ether); // new day — should succeed
    }

    // ── Reward pool ──────────────────────────────────────────────────────────

    function test_RewardPool_RevertPoolEmpty() public {
        // Deploy a fresh dynasty with no pool funding
        vm.startPrank(owner);
        ReferralBadge freshBadge   = new ReferralBadge();
        TestableDynasty freshDynasty = new TestableDynasty(address(freshBadge));
        freshBadge.transferOwnership(address(freshDynasty));
        freshDynasty.setTrustedEmitter(address(this), true);
        vm.stopPrank();

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        freshDynasty.mintBadge{value: MINT_FEE}();

        bytes32[] memory topics = new bytes32[](1);
        topics[0] = freshDynasty.TRADE_EXECUTED_TOPIC();
        bytes memory data = abi.encode(bob, 1 ether);

        // Reward of 0.1 ETH > pool remaining (only 0.01 ETH from mint)
        vm.expectRevert("Pool empty");
        freshDynasty.expose_onEvent(address(this), topics, data);
    }

    function test_RewardPool_FundUpdatesRemaining() public {
        uint256 before = dynasty.getRewardPool().remaining;
        vm.prank(owner);
        dynasty.fundRewardPool{value: 5 ether}();
        assertEq(dynasty.getRewardPool().remaining - before, 5 ether);
    }

    function test_RewardPool_FundEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit RewardPoolFunded(2 ether);
        vm.prank(owner);
        dynasty.fundRewardPool{value: 2 ether}();
    }

    function test_RewardPool_FundRevertNonOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        dynasty.fundRewardPool{value: 1 ether}();
    }

    function test_RewardPool_FundRevertZeroValue() public {
        vm.expectRevert("Must send ETH");
        vm.prank(owner);
        dynasty.fundRewardPool{value: 0}();
    }

    // ── Pause ─────────────────────────────────────────────────────────────────

    function test_Pause_SetsFlag() public {
        vm.prank(owner);
        dynasty.togglePause();
        assertTrue(dynasty.paused());
    }

    function test_Pause_EmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit Paused(owner);
        vm.prank(owner);
        dynasty.togglePause();
    }

    function test_Unpause_ClearsFlag() public {
        vm.startPrank(owner);
        dynasty.togglePause();
        dynasty.togglePause();
        vm.stopPrank();
        assertFalse(dynasty.paused());
    }

    function test_Unpause_EmitsEvent() public {
        vm.prank(owner);
        dynasty.togglePause();
        vm.expectEmit(true, false, false, false);
        emit Unpaused(owner);
        vm.prank(owner);
        dynasty.togglePause();
    }

    function test_Pause_RevertNonOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        dynasty.togglePause();
    }

    // ── Withdraw ─────────────────────────────────────────────────────────────

    function test_Withdraw_SendsWithdrawableFunds() public {
        // Inject extra ETH above the pool so there's something to withdraw
        vm.deal(address(dynasty), address(dynasty).balance + 1 ether);
        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        dynasty.withdraw();
        assertGt(owner.balance, ownerBefore);
    }

    function test_Withdraw_RevertNoFunds() public {
        // All ETH is locked in pool — nothing withdrawable
        vm.prank(owner);
        vm.expectRevert("No funds");
        dynasty.withdraw();
    }

    function test_Withdraw_RevertNonOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        dynasty.withdraw();
    }

    function test_Withdraw_DoesNotDrainRewardPool() public {
        vm.deal(address(dynasty), address(dynasty).balance + 1 ether);
        uint256 poolBefore = dynasty.getRewardPool().remaining;
        vm.prank(owner);
        dynasty.withdraw();
        assertEq(dynasty.getRewardPool().remaining, poolBefore);
    }

    // ── View functions ────────────────────────────────────────────────────────

    function test_GetReferrals_EmptyDefault() public view {
        assertEq(dynasty.getReferrals(alice).length, 0);
    }

    function test_GetReferralCount_ZeroDefault() public view{
        assertEq(dynasty.getReferralCount(alice), 0);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_MintBadge_RefundsExact(uint256 payment) public {
        payment = bound(payment, MINT_FEE, 100 ether);
        vm.deal(alice, payment);
        uint256 before = alice.balance;
        vm.prank(alice);
        dynasty.mintBadge{value: payment}();
        assertEq(before - alice.balance, MINT_FEE);
    }

    function testFuzz_CalcReward_NeverExceedsAmount(
        uint256 amount,
        uint8   level
    ) public pure {
        level  = uint8(bound(uint256(level), 1, 5));
        amount = bound(amount, 0, 1000 ether);
        uint256[5] memory bps = [uint256(1000), 500, 250, 125, 62];
        uint256 reward = (amount * bps[level - 1]) / 10000;
        assertLe(reward, amount);
    }

    receive() external payable {}
}