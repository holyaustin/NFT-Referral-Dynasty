// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReferralBadge {
    function mint(address user) external returns (uint256);
    function hasBadge(address user) external view returns (bool);
    function incrementReferral(address user) external;
}

/**
 * @title ReferralDynasty
 * @dev Reactive handler for UserRegistered events emitted by UserRegistry.
 *
 * This contract listens for UserRegistered events, mints referral badges for new
 * ═══════════════════════════════════════════════════════════════════════
 * ALL FIXES
 * ═══════════════════════════════════════════════════════════════════════
 * Fix 1 – Soft-fail on untrusted emitter (emit UntrustedEmitter, return).
 * Fix 2 – Extract addresses from topics, not from data (core fix).
 * Fix 3 – Require topics.length >= 3; emit TopicMismatch for observability.
 * Fix 4 – Test script: wrap queryFilter in try/catch for Somnia BAD_DATA bug.
 */
contract ReferralDynasty is SomniaEventHandler, Ownable, ReentrancyGuard {

    // ============ Constants ============

    /**
     * @dev keccak256("UserRegistered(address,address)")
     *
     * Canonical ABI form: base types only, no parameter names, no `indexed`
     * keyword, no spaces. This string is identical whether the params are
     * declared indexed or not — the topic hash is the same in both cases.
     */
    bytes32 public constant USER_REGISTERED_TOPIC =
        keccak256("UserRegistered(address,address)");

    uint256 public constant REFERRAL_REWARD = 0.0001 ether;

    // ============ State ============

    IReferralBadge public immutable badge;
    mapping(address => bool) public trustedEmitters;

    uint256 public totalReferrals;
    bool public paused;

    // ============ Events ============

    event ReferralProcessed(address indexed referrer, address indexed newUser);
    event MintFailed(address indexed user, string reason);
    event EmitterTrustSet(address indexed emitter, bool trusted);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    /// @notice Emitted (instead of reverting) when the caller is not a trusted emitter.
    event UntrustedEmitter(address indexed emitter);

    /**
     * @notice Emitted when topics[0] is not USER_REGISTERED_TOPIC, or when
     *         topics.length < 3 (missing the two indexed address slots).
     */
    event TopicMismatch(bytes32 indexed received, bytes32 indexed expected);

    // ============ Constructor ============

    constructor(address badgeContract) Ownable(msg.sender) {
        require(badgeContract != address(0), "Invalid badge address");
        badge = IReferralBadge(badgeContract);
    }

    // ============ Modifiers ============

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    // ============ REACTIVE HANDLER ============

    /**
     * @dev Entry point called by the Somnia reactive network on each matched event.
     *
     * Encoding of `event UserRegistered(address indexed, address indexed)`:
     *
     *   topics[0]  keccak256("UserRegistered(address,address)")   always present
     *   topics[1]  newUser  — left-padded address (32 bytes)      indexed param
     *   topics[2]  referrer — left-padded address (32 bytes)      indexed param
     *   data       0x  (empty; all params are indexed)
     *
     * Extraction pattern:
     *   address a = address(uint160(uint256(topics[N])));
     *
     * @param emitter      Address of the contract that emitted the log.
     * @param eventTopics  topics[] from the emitted log (sig hash + indexed params).
     * @param data         Non-indexed ABI-encoded payload (empty for this event).
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override whenNotPaused nonReentrant {

        if (!trustedEmitters[emitter]) {
            emit UntrustedEmitter(emitter);
            return;
        }

        if (eventTopics.length < 3) {
            bytes32 got = eventTopics.length > 0 ? eventTopics[0] : bytes32(0);
            emit TopicMismatch(got, USER_REGISTERED_TOPIC);
            return;
        }

        if (eventTopics[0] != USER_REGISTERED_TOPIC) {
            emit TopicMismatch(eventTopics[0], USER_REGISTERED_TOPIC);
            return;
        }

        address newUser  = address(uint160(uint256(eventTopics[1])));
        address referrer = address(uint160(uint256(eventTopics[2])));

        // Silence the unused-variable compiler warning for `data`.
        (data);

        _processReferral(referrer, newUser);
    }

    // ============ Core Logic ============

    function _processReferral(address referrer, address newUser) internal {
        if (referrer == address(0) || newUser == address(0) || referrer == newUser) {
            emit MintFailed(newUser, "Invalid addresses");
            return;
        }

        try badge.mint(newUser) {
            emit ReferralProcessed(referrer, newUser);
            totalReferrals++;

            try badge.incrementReferral(referrer) {
                // Referrer's count incremented successfully.
            } catch {
                // Referrer may not yet hold a badge — silent fail is correct.
            }

        } catch Error(string memory reason) {
            emit MintFailed(newUser, reason);
        } catch {
            emit MintFailed(newUser, "Unknown mint error");
        }
    }

    // ============ Admin ============

    function setTrustedEmitter(address emitter, bool trusted) external onlyOwner {
        require(emitter != address(0), "Invalid address");
        trustedEmitters[emitter] = trusted;
        emit EmitterTrustSet(emitter, trusted);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ============ Views ============

    function isTrustedEmitter(address emitter) external view returns (bool) {
        return trustedEmitters[emitter];
    }

    /**
     * @notice Compute the keccak256 topic hash for any event signature.
     * @dev    Use to verify the emitter's signature matches USER_REGISTERED_TOPIC:
     *         cast call <dynasty_addr> "computeEventTopic(string)" "UserRegistered(address,address)"
     */
    function computeEventTopic(string calldata eventSignature)
        external
        pure
        returns (bytes32)
    {
        return keccak256(bytes(eventSignature));
    }

    receive() external payable {}
}