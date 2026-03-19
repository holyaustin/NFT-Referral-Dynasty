// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReferralDynasty } from "../ReferralDynasty.sol";

contract TestableDynasty is ReferralDynasty {
    constructor(address badgeContract) ReferralDynasty(badgeContract) {}
    
    function expose_onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external whenNotPaused nonReentrant {
        // Only check trustedEmitters (isTrustedRegistry was removed)
        require(this.isTrustedEmitter(emitter), "Untrusted emitter");
        require(eventTopics.length > 0, "No topics");
        
        if (eventTopics[0] == USER_REGISTERED_TOPIC) {
            (address newUser, address referrer) = abi.decode(data, (address, address));
            _processReferral(referrer, newUser);
        }
    }
}