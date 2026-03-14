// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ReferralDynasty } from "../ReferralDynasty.sol";

contract TestableDynasty is ReferralDynasty {
    constructor(address badgeContract) ReferralDynasty(badgeContract) {}
    
    // No need to override mintBadge - it doesn't exist in parent
    // The minting flow is: UserRegistry emits event -> _onEvent -> badge.mint()
    
    function expose_onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external whenNotPaused nonReentrant {
        // Check both trusted registries and trusted emitters
        require(
            this.isTrustedRegistry(emitter) || this.isTrustedEmitter(emitter),
            "Untrusted emitter"
        );
        require(eventTopics.length > 0, "No topics");
        
        if (eventTopics[0] == USER_REGISTERED_TOPIC) {
            (address newUser, address referrer) = abi.decode(data, (address, address));
            _processReferral(referrer, newUser);
        }
    }
}