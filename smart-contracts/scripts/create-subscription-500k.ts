import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
} from 'viem';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🚀 Creating Subscription with 2M GAS...");
  console.log("=========================================");

  // ─── Load deployment ──────────────────────────────────────────────────────
  const deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );

  // FIX (Issue 3): Read the topic that was verified at deploy time instead of
  // recomputing it here. keccak256(toHex(string)) hashes the hex-encoded bytes
  // of the string, NOT the UTF-8 bytes, producing a wrong hash. The deploy
  // script uses the on-chain computeEventTopic() result which calls
  // keccak256(bytes(sig)) — the correct ABI topic derivation.
  const userRegisteredTopic = deployment.userRegisteredTopic as `0x${string}`;
  if (!userRegisteredTopic) {
    throw new Error(
      "❌ userRegisteredTopic missing from deployment JSON. " +
      "Re-run deploy-referral-system.ts to regenerate it."
    );
  }

  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in environment");
  }

  const privateKey = process.env.PRIVATE_KEY.startsWith('0x')
    ? process.env.PRIVATE_KEY as `0x${string}`
    : `0x${process.env.PRIVATE_KEY}` as `0x${string}`;

  const account = privateKeyToAccount(privateKey);

  const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(rpcUrl),
  });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  const handlerAddress = deployment.contracts.ReferralDynasty as `0x${string}`;
  const emitterAddress = deployment.contracts.UserRegistry as `0x${string}`;

  console.log(`\n📋 Handler  (Dynasty) : ${handlerAddress}`);
  console.log(`📋 Emitter  (Registry): ${emitterAddress}`);
  console.log(`📋 Event topic        : ${userRegisteredTopic}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${Number(balance) / 1e18} SOM`);

  const subData = {
    handlerContractAddress: handlerAddress,
    priorityFeePerGas: parseGwei('2'),
    maxFeePerGas:      parseGwei('10'),
    // 5M gas covers the _onEvent path including both badge.mint and
    // badge.incrementReferral try/catch blocks with headroom to spare.
    gasLimit:    5_000_000n,
    isGuaranteed: true,
    isCoalesced:  false,
    emitter:      emitterAddress,
    eventTopics:  [userRegisteredTopic],
  };

  console.log("\n📦 Creating subscription...");

  try {
    const txHash = await sdk.createSoliditySubscription(subData);

    if (txHash instanceof Error) {
      console.error('❌ Subscription creation failed:', txHash.message);
      process.exitCode = 1;
      return;
    }

    console.log('✅ SUBSCRIPTION CREATED!');
    console.log('📝 Transaction Hash:', txHash);
    console.log(`🔗 Explorer: https://shannon-explorer.somnia.network/tx/${txHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

    // Persist the subscription tx for reference in test scripts
    const updated = { ...deployment, subscriptionTx: txHash };
    fs.writeFileSync(
      './deployment-referral-system.json',
      JSON.stringify(updated, null, 2)
    );
    console.log("📄 deployment-referral-system.json updated with subscriptionTx");

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exitCode = 1;
  }
}

main().catch(console.error);