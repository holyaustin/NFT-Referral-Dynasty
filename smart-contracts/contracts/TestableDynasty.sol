// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ReferralDynasty } from "./ReferralDynasty.sol";

/**
 * @title  TestableDynasty
 * @notice Thin test wrapper that exposes _onEvent as a public function.
 *
 * In production, Somnia validators call _onEvent via the precompile.
 * In tests, we call expose_onEvent() directly from a registered trusted
 * emitter (the test contract or a signer).
 *
 * Deploy order in tests:
 *   1. Deploy ReferralBadge
 *   2. Deploy TestableDynasty(badgeAddress)
 *   3. badge.transferOwnership(address(testableDynasty))
 */
contract TestableDynasty is ReferralDynasty {

    constructor(address badgeContract) ReferralDynasty(badgeContract) {}

    /**
     * @dev Public entry point that mirrors the internal _onEvent routing.
     *      Performs identical trust + topic guards so test assertions remain
     *      accurate to production behaviour.
     */
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
        // unknown topics silently ignored — forward compatible
    }
}