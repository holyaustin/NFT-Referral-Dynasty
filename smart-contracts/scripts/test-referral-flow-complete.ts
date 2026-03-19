import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Somnia testnet RPC compatibility shim
// ─────────────────────────────────────────────────────────────────────────────
// ethers v6 requires every log object to have a boolean `removed` field.
// Somnia's RPC node omits it, causing:
//   BAD_DATA: invalid value for value.removed (invalid boolean; undefined)
//
// The workaround is to use provider.getLogs() with a raw filter instead of
// contract.queryFilter(), then parse the ABI topics/data manually.
// ─────────────────────────────────────────────────────────────────────────────

async function safeQueryLogs(
  provider: ethers.Provider,
  contractAddress: string,
  iface: ethers.Interface,
  eventName: string,
  fromBlock: number,
  toBlock: number
): Promise<ethers.LogDescription[]> {
  const eventFragment = iface.getEvent(eventName);
  if (!eventFragment) return [];

  // ethers v6: topic hash lives on the EventFragment itself.
  // iface.getEventTopic() was removed — use eventFragment.topicHash instead.
  const topicHash = eventFragment.topicHash;
  let rawLogs: Array<{
    address: string;
    topics: string[];
    data: string;
    blockNumber: string | number;
    transactionHash: string;
    logIndex: string | number;
    [key: string]: unknown;
  }>;

  try {
    // Use raw provider getLogs which does not parse the log objects
    rawLogs = await (provider as any).send("eth_getLogs", [
      {
        address: contractAddress,
        topics: [topicHash],
        fromBlock: "0x" + fromBlock.toString(16),
        toBlock:   "0x" + toBlock.toString(16),
      },
    ]);
  } catch (err) {
    console.warn(`   ⚠️  eth_getLogs failed for ${eventName}:`, (err as Error).message);
    return [];
  }

  const results: ethers.LogDescription[] = [];
  for (const raw of rawLogs) {
    try {
      const parsed = iface.parseLog({
        topics: raw.topics as string[],
        data:   raw.data   as string,
      });
      if (parsed) results.push(parsed);
    } catch {
      // Ignore logs that don't match this event's ABI
    }
  }
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🧪 Complete Referral Flow Test");
  console.log("==============================");

  const { ethers: hreEthers } = await hre.network.connect();
  const [deployer] = await hreEthers.getSigners();

  const deployment = JSON.parse(
    fs.readFileSync("./deployment-referral-system.json", "utf-8")
  );

  // ─── Attach contracts ───────────────────────────────────────────────────────
  const registry = await hreEthers.getContractAt(
    "UserRegistry",
    deployment.contracts.UserRegistry
  ) as any;

  const badge = await hreEthers.getContractAt(
    "ReferralBadge",
    deployment.contracts.ReferralBadge
  ) as any;

  const dynasty = await hreEthers.getContractAt(
    "ReferralDynasty",
    deployment.contracts.ReferralDynasty
  ) as any;

  const dynastyIface: ethers.Interface = dynasty.interface;
  const provider = hreEthers.provider;

  // ─── Pre-flight checks ─────────────────────────────────────────────────────
  console.log("\n🔎 Pre-flight checks...");

  const isTrusted: boolean = await dynasty.trustedEmitters(deployment.contracts.UserRegistry);
  if (!isTrusted) {
    throw new Error(
      "❌ UserRegistry is NOT a trusted emitter on ReferralDynasty.\n" +
      "   Fix: call dynasty.setTrustedEmitter(registryAddress, true) as owner."
    );
  }
  console.log("   ✅ Trusted emitter:   OK");

  const onChainTopic: string  = await dynasty.USER_REGISTERED_TOPIC();
  const deployedTopic: string = deployment.userRegisteredTopic;
  if (onChainTopic.toLowerCase() !== deployedTopic?.toLowerCase()) {
    throw new Error(
      `❌ Topic mismatch!\n` +
      `   On-chain : ${onChainTopic}\n` +
      `   Deployed : ${deployedTopic}`
    );
  }
  console.log("   ✅ Event topic:       OK");

  const isPaused: boolean = await dynasty.paused();
  if (isPaused) throw new Error("❌ Dynasty is paused — call unpause() first.");
  console.log("   ✅ Contract paused:   false");

  // ─── Confirm the indexing layout ───────────────────────────────────────────
  // The critical check: UserRegistered must have BOTH params as indexed so the
  // reactive network puts them in topics[1] and topics[2], not in data.
  console.log("\n🔎 Verifying UserRegistered event parameter encoding...");
  const userRegisteredEvent = registry.interface.getEvent("UserRegistered");
  if (!userRegisteredEvent) throw new Error("❌ UserRegistered event not found in UserRegistry ABI");

  const nonIndexedParams = userRegisteredEvent.inputs.filter((i: any) => !i.indexed);
  if (nonIndexedParams.length > 0) {
    // Some params are NOT indexed → they go to data. The dynasty must then
    // use abi.decode(data,...) for those. Warn so the dev can verify.
    console.warn(
      "   ⚠️  Non-indexed params found in UserRegistered:",
      nonIndexedParams.map((p: any) => p.name).join(", "),
      "\n   Dynasty assumes ALL params are indexed (extracted from topics).",
      "\n   If this is intentional, update _onEvent to abi.decode(data,...) for these params."
    );
  } else {
    console.log("   ✅ All params are indexed — dynasty will read from topics[1] and topics[2]");
  }
  console.log("");

  // ─── Create test wallets ────────────────────────────────────────────────────
  const referrerWallet = ethers.Wallet.createRandom().connect(provider);
  const newUserWallet  = ethers.Wallet.createRandom().connect(provider);

  console.log("📋 Addresses:");
  console.log(`   Deployer : ${deployer.address}`);
  console.log(`   Referrer : ${referrerWallet.address}`);
  console.log(`   New user : ${newUserWallet.address}`);

  // ─── Fund accounts ──────────────────────────────────────────────────────────
  console.log("\n💰 Funding accounts...");
  await (await deployer.sendTransaction({ to: referrerWallet.address, value: ethers.parseEther("0.04") })).wait();
  await (await deployer.sendTransaction({ to: newUserWallet.address,  value: ethers.parseEther("0.04") })).wait();
  console.log("   ✅ Funded");

  // ─── Step 1: Give referrer a badge ─────────────────────────────────────────
  console.log("\n📝 Step 1: Minting badge for referrer...");
  try {
    const mintTx = await badge.mint(referrerWallet.address);
    await mintTx.wait();
    console.log("   ✅ Badge minted directly");
  } catch {
    console.log("   ℹ️  Direct mint restricted — registering referrer with no referrer instead");
    await (await registry.connect(referrerWallet).register(ethers.ZeroAddress)).wait();
    console.log("   ⏳ Waiting 25s for reactive badge mint...");
    await sleep(25_000);
    const hasBadge: boolean = await badge.hasBadge(referrerWallet.address);
    if (!hasBadge) {
      console.warn("   ⚠️  Referrer still has no badge — referral count increment will silently skip");
    } else {
      console.log("   ✅ Referrer badge confirmed via reactive path");
    }
  }

  // ─── Step 2: Register new user with referrer ────────────────────────────────
  console.log("\n📝 Step 2: Registering new user with referrer...");
  const startBlock = await provider.getBlockNumber();
  const registerTx = await registry.connect(newUserWallet).register(referrerWallet.address);
  const receipt     = await registerTx.wait();
  console.log(`   ✅ Registered. Tx: ${receipt?.hash}`);

  // ─── Wait for reactive execution ────────────────────────────────────────────
  const waitMs = 30_000;
  console.log(`\n⏳ Waiting ${waitMs / 1000}s for reactive network...`);
  await sleep(waitMs);

  // ─── Step 3: Read on-chain state ────────────────────────────────────────────
  console.log("\n🔍 Results:");

  const newUserHasBadge: boolean = await badge.hasBadge(newUserWallet.address);
  console.log(`   📊 New user has badge      : ${newUserHasBadge}`);

  let referralCount = "N/A";
  try {
    const referrerData = await badge.getUserBadge(referrerWallet.address);
    referralCount = referrerData.referralCount?.toString() ?? "N/A";
  } catch { /* getUserBadge may not exist */ }
  console.log(`   📊 Referrer referral count : ${referralCount}`);

  const totalReferrals = await dynasty.totalReferrals();
  console.log(`   📊 Dynasty totalReferrals  : ${totalReferrals}`);

  // ─── Step 4: Query events safely (bypasses Somnia BAD_DATA bug) ─────────────
  const endBlock   = await provider.getBlockNumber();
  const fromBlock  = Math.max(startBlock - 5, 0);

  console.log(`\n🔍 Querying events (blocks ${fromBlock} → ${endBlock})...`);

  const untrustedLogs = await safeQueryLogs(
    provider, deployment.contracts.ReferralDynasty, dynastyIface,
    "UntrustedEmitter", fromBlock, endBlock
  );
  if (untrustedLogs.length > 0) {
    console.log(`\n⚠️  UntrustedEmitter events (${untrustedLogs.length}):`);
    untrustedLogs.forEach(l => console.log(`   - emitter: ${l.args.emitter}`));
  }

  const topicMismatchLogs = await safeQueryLogs(
    provider, deployment.contracts.ReferralDynasty, dynastyIface,
    "TopicMismatch", fromBlock, endBlock
  );
  if (topicMismatchLogs.length > 0) {
    console.log(`\n⚠️  TopicMismatch events (${topicMismatchLogs.length}):`);
    topicMismatchLogs.forEach(l =>
      console.log(`   - received: ${l.args.received}\n     expected: ${l.args.expected}`)
    );
  }

  const mintFailedLogs = await safeQueryLogs(
    provider, deployment.contracts.ReferralDynasty, dynastyIface,
    "MintFailed", fromBlock, endBlock
  );
  if (mintFailedLogs.length > 0) {
    console.log(`\n❌ MintFailed events (${mintFailedLogs.length}):`);
    mintFailedLogs.forEach(l =>
      console.log(`   - user: ${l.args.user} | reason: ${l.args.reason}`)
    );
  }

  const referralLogs = await safeQueryLogs(
    provider, deployment.contracts.ReferralDynasty, dynastyIface,
    "ReferralProcessed", fromBlock, endBlock
  );
  if (referralLogs.length > 0) {
    console.log(`\n✅ ReferralProcessed events (${referralLogs.length}):`);
    referralLogs.forEach(l =>
      console.log(`   - referrer: ${l.args.referrer} → newUser: ${l.args.newUser}`)
    );
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n📋 SUMMARY");
  console.log("──────────");
  if (newUserHasBadge) {
    console.log("✅ SUCCESS — badge minted for new user via reactive referral!");
  } else {
    console.log("❌ Badge NOT minted. Diagnostic checklist:");
    console.log(`   Trusted emitter?         ${isTrusted}`);
    console.log(`   Topic match?             ${onChainTopic.toLowerCase() === deployedTopic?.toLowerCase()}`);
    console.log(`   UntrustedEmitter events? ${untrustedLogs.length > 0}`);
    console.log(`   TopicMismatch events?    ${topicMismatchLogs.length > 0}`);
    console.log(`   MintFailed events?       ${mintFailedLogs.length > 0}`);
    console.log(`\n   🔗 https://shannon-explorer.somnia.network/address/${deployment.contracts.ReferralDynasty}`);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});