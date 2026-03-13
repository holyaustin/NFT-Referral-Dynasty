import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * ReferralDynastyModule
 *
 * Hardhat Ignition deployment module for ReferralDynasty.
 * Handles:
 *   1. Contract deployment
 *   2. Post-deploy setup: trusted emitter registration + reward pool funding
 *
 * Parameters are read from ignition/parameters.json at deploy time.
 * Example parameters.json:
 * {
 *   "ReferralDynastyModule": {
 *     "trustedEmitter": "0xYourProtocolContractAddress",
 *     "rewardPoolSeedWei": "1000000000000000000"
 *   }
 * }
 */
const ReferralDynastyModule = buildModule("ReferralDynastyModule", (m) => {
  // ── Parameters ──────────────────────────────────────────────────────────────

  // Address of the Somnia reactivity precompile / protocol contract
  // that will emit UserRegistered and TradeExecuted events.
  const trustedEmitter = m.getParameter<string>(
    "trustedEmitter",
    "0x0000000000000000000000000000000000000000" // placeholder — must be overridden
  );

  // Initial reward pool seed in wei (default 0.1 ETH for testnet)
  const rewardPoolSeedWei = m.getParameter<bigint>(
    "rewardPoolSeedWei",
    100_000_000_000_000_000n // 0.1 ETH
  );

  // ── Deploy ───────────────────────────────────────────────────────────────────

  const dynasty = m.contract("ReferralDynasty", [], {
    id: "ReferralDynasty",
  });

  // ── Post-deploy: register trusted emitter ───────────────────────────────────

  m.call(dynasty, "setTrustedEmitter", [trustedEmitter, true], {
    id: "SetTrustedEmitter",
    after: [dynasty],
  });

  // ── Post-deploy: seed reward pool ────────────────────────────────────────────

  m.call(dynasty, "fundRewardPool", [], {
    id: "FundRewardPool",
    value: rewardPoolSeedWei,
    after: [dynasty],
  });

  return { dynasty };
});

export default ReferralDynastyModule;