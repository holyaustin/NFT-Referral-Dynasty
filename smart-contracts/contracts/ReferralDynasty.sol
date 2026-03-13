// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
//  Two contracts in one file — zero inheritance conflicts
//
//  WHY TWO CONTRACTS?
//  SomniaEventHandler seals supportsInterface as `external pure` (no virtual).
//  ERC721 also defines supportsInterface. Solidity forbids inheriting both.
//  Fix: ReferralBadge inherits only ERC721. ReferralDynasty inherits only
//  SomniaEventHandler. ReferralDynasty owns and calls ReferralBadge.
//
//  DEPLOY ORDER:
//    1. Deploy ReferralBadge  → get address A
//    2. Deploy ReferralDynasty(A)
//    3. Call ReferralBadge.transferOwnership(ReferralDynasty address)
// ─────────────────────────────────────────────────────────────────────────────

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

// =============================================================================
//  CONTRACT 1 — ReferralBadge
//  Pure ERC721. No Somnia imports. No supportsInterface conflict.
//  Owned by ReferralDynasty after deploy.
// =============================================================================
contract ReferralBadge is ERC721, Ownable {
    using Strings for uint256;

    struct Badge {
        uint8   tier;           // 0 Bronze · 1 Silver · 2 Gold · 3 Platinum
        uint24  referralCount;
        uint256 lastUpdate;
    }

    mapping(uint256 => Badge)   public badges;
    mapping(address => uint256) public userTokenId;
    mapping(address => bool)    public hasBadge;

    uint256 public totalBadges;

    uint256 private constant SILVER_THRESHOLD   =  5;
    uint256 private constant GOLD_THRESHOLD     = 20;
    uint256 private constant PLATINUM_THRESHOLD = 50;

    event BadgeMinted(address indexed user, uint256 indexed tokenId);
    event BadgeUpgraded(uint256 indexed tokenId, uint8 newTier, uint24 count);

    constructor() ERC721("Referral Dynasty", "RDYST") Ownable(msg.sender) {}

    // ── Called only by ReferralDynasty (owner) ───────────────────────────────

    function mint(address user) external onlyOwner returns (uint256) {
        require(!hasBadge[user], "Already have badge");

        unchecked { totalBadges++; }
        uint256 tokenId = totalBadges;

        hasBadge[user]    = true;
        userTokenId[user] = tokenId;
        badges[tokenId]   = Badge({ tier: 0, referralCount: 0, lastUpdate: block.timestamp });

        _safeMint(user, tokenId);
        emit BadgeMinted(user, tokenId);
        return tokenId;
    }

    function incrementReferral(address user) external onlyOwner {
        uint256 tokenId = userTokenId[user];
        require(tokenId != 0, "No badge");

        Badge storage b = badges[tokenId];
        unchecked { b.referralCount++; }

        uint8 newTier = _getTier(b.referralCount);
        if (newTier > b.tier) {
            b.tier       = newTier;
            b.lastUpdate = block.timestamp;
            emit BadgeUpgraded(tokenId, newTier, b.referralCount);
        }
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getBadge(uint256 tokenId) external view returns (Badge memory) {
        require(_ownerOf(tokenId) != address(0), "Badge not found");
        return badges[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Nonexistent");
        return string(abi.encodePacked("ipfs://QmBase/", tokenId.toString(), ".json"));
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _getTier(uint256 count) internal pure returns (uint8) {
        if (count >= PLATINUM_THRESHOLD) return 3;
        if (count >= GOLD_THRESHOLD)     return 2;
        if (count >= SILVER_THRESHOLD)   return 1;
        return 0;
    }
}

// =============================================================================
//  CONTRACT 2 — ReferralDynasty
//  Somnia reactive handler + referral logic + reward pool.
//  No ERC721 imports. No supportsInterface conflict.
// =============================================================================
contract ReferralDynasty is SomniaEventHandler, Ownable, ReentrancyGuard {

    // ── Constants ─────────────────────────────────────────────────────────────

    bytes32 public constant USER_REGISTERED_TOPIC =
        keccak256("UserRegistered(address,address)");
    bytes32 public constant TRADE_EXECUTED_TOPIC =
        keccak256("TradeExecuted(address,uint256)");

    uint256 public constant MINT_FEE             = 0.01 ether;
    uint256 public constant MIN_REWARD_THRESHOLD = 0.001 ether;
    uint256 public constant MAX_DOWNLINE         = 1000;
    uint256 public constant REFERRAL_DEPTH       = 5;
    uint256 public constant REWARD_COOLDOWN      = 1 hours;
    uint256 public constant DAILY_REWARD_LIMIT   = 1 ether;

    uint256 public constant TIER_1_BPS = 1000; // 10.00 %
    uint256 public constant TIER_2_BPS =  500; //  5.00 %
    uint256 public constant TIER_3_BPS =  250; //  2.50 %
    uint256 public constant TIER_4_BPS =  125; //  1.25 %
    uint256 public constant TIER_5_BPS =   62; //  0.62 %

    // ── State ─────────────────────────────────────────────────────────────────

    ReferralBadge public immutable badge;

    struct User {
        address   referrer;
        uint32    referralCount;
        uint256   totalRewards;
        uint256   lastActive;
        uint256   lastRewardTime;
        uint256   dailyRewards;
        uint256   dailyEpoch;
        address[] downline;
    }

    struct RewardPool {
        uint256 totalDeposited;
        uint256 totalDistributed;
        uint256 remaining;
    }

    mapping(address => User) public users;
    mapping(address => bool) public trustedEmitters;

    RewardPool public rewardPool;

    uint256 public totalReferrals;
    bool    public paused;

    // ── Events ────────────────────────────────────────────────────────────────

    event ReferralMade(address indexed referrer, address indexed newUser);
    event RewardPaid(address indexed user, uint256 amount, uint8 level);
    event RewardPoolFunded(uint256 amount);
    event TrustedEmitterSet(address indexed emitter, bool trusted);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier whenActive() {
        require(!paused, "Paused");
        _;
    }

    modifier validAddress(address a) {
        require(a != address(0), "Zero address");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param badgeContract Address of the deployed ReferralBadge contract.
     *                      Call badge.transferOwnership(address(this)) after deploy.
     */
    constructor(address badgeContract) Ownable(msg.sender) validAddress(badgeContract) {
        badge = ReferralBadge(badgeContract);
    }

    // ── Somnia Reactive handler ───────────────────────────────────────────────

    /**
     * @dev Somnia validators invoke this automatically when a subscribed event
     *      fires. This is the ONLY function from SomniaEventHandler we override.
     *      No supportsInterface override — no conflict.
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes    calldata data
    ) internal override whenActive nonReentrant {
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
        // unknown topics ignored — forward compatible
    }

    // ── Badge minting (public) ────────────────────────────────────────────────

    function mintBadge()
        external
        payable
        whenActive
        nonReentrant
        returns (uint256)
    {
        require(msg.value >= MINT_FEE, "Need 0.01 ETH");

        uint256 excess = msg.value - MINT_FEE;
        if (excess > 0) {
            (bool ok,) = payable(msg.sender).call{value: excess}("");
            require(ok, "Refund failed");
        }

        uint256 tokenId = badge.mint(msg.sender);

        rewardPool.totalDeposited += MINT_FEE;
        rewardPool.remaining      += MINT_FEE;

        return tokenId;
    }

    // ── Referral logic ────────────────────────────────────────────────────────

    function _addReferral(address referrer, address newUser)
        internal
        validAddress(referrer)
        validAddress(newUser)
    {
        require(badge.hasBadge(referrer),                       "Referrer no badge");
        require(users[newUser].referrer == address(0),          "Already referred");
        require(referrer != newUser,                            "Self refer");
        require(users[referrer].downline.length < MAX_DOWNLINE, "Downline full");

        users[newUser].referrer = referrer;
        users[referrer].downline.push(newUser);
        unchecked {
            users[referrer].referralCount++;
            totalReferrals++;
        }
        users[referrer].lastActive = block.timestamp;

        badge.incrementReferral(referrer);

        emit ReferralMade(referrer, newUser);
    }

    // ── Reward cascade ────────────────────────────────────────────────────────

    function _processRewards(address trader, uint256 amount) internal {
        require(amount > 0, "Zero amount");

        address current = users[trader].referrer;
        uint256 level   = 1;

        while (current != address(0) && level <= REFERRAL_DEPTH) {
            if (badge.hasBadge(current)) {
                uint256 reward = _calcReward(amount, level);
                if (reward >= MIN_REWARD_THRESHOLD) {
                    _sendReward(current, reward, uint8(level));
                }
            }
            current = users[current].referrer;
            unchecked { level++; }
        }
    }

    function _sendReward(address user, uint256 amount, uint8 level) internal {
        User storage u = users[user];

        require(block.timestamp >= u.lastRewardTime + REWARD_COOLDOWN, "Cooldown active");

        uint256 today = block.timestamp / 1 days;
        if (u.dailyEpoch < today) {
            u.dailyRewards = 0;
            u.dailyEpoch   = today;
        }
        require(u.dailyRewards + amount <= DAILY_REWARD_LIMIT, "Daily limit");
        require(rewardPool.remaining >= amount,                 "Pool empty");

        // Effects before interaction (CEI)
        u.totalRewards   += amount;
        u.lastActive      = block.timestamp;
        u.lastRewardTime  = block.timestamp;
        u.dailyRewards   += amount;
        unchecked { rewardPool.totalDistributed += amount; }
        rewardPool.remaining -= amount;

        (bool ok,) = payable(user).call{value: amount}("");
        require(ok, "Transfer failed");

        emit RewardPaid(user, amount, level);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _calcReward(uint256 amount, uint256 level)
        internal
        pure
        returns (uint256)
    {
        uint256 bps;
        if      (level == 1) bps = TIER_1_BPS;
        else if (level == 2) bps = TIER_2_BPS;
        else if (level == 3) bps = TIER_3_BPS;
        else if (level == 4) bps = TIER_4_BPS;
        else if (level == 5) bps = TIER_5_BPS;
        else return 0;
        return (amount * bps) / 10000;
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getReferrals(address user) external view returns (address[] memory) {
        return users[user].downline;
    }

    function getReferralCount(address user) external view returns (uint256) {
        return users[user].referralCount;
    }

    function getRewardPool() external view returns (RewardPool memory) {
        return rewardPool;
    }

    // ── Owner ─────────────────────────────────────────────────────────────────

    function setTrustedEmitter(address emitter, bool trusted)
        external
        onlyOwner
        validAddress(emitter)
    {
        trustedEmitters[emitter] = trusted;
        emit TrustedEmitterSet(emitter, trusted);
    }

    function fundRewardPool() external payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
        rewardPool.totalDeposited += msg.value;
        rewardPool.remaining      += msg.value;
        emit RewardPoolFunded(msg.value);
    }

    function togglePause() external onlyOwner {
        paused = !paused;
        if (paused) emit Paused(msg.sender);
        else        emit Unpaused(msg.sender);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 withdrawable = address(this).balance - rewardPool.remaining;
        require(withdrawable > 0, "No funds");
        (bool ok,) = payable(owner()).call{value: withdrawable}("");
        require(ok, "Withdraw failed");
    }

    receive() external payable {}
}