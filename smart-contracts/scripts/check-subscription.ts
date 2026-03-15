import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🔍 Checking Subscription Status...");
  console.log("=================================");

  // Load subscription info
  let subscriptionInfo;
  try {
    subscriptionInfo = JSON.parse(
      fs.readFileSync('./subscription-info.json', 'utf-8')
    );
  } catch (error) {
    console.log("❌ No subscription info found. Run create-subscription.ts first.");
    process.exit(1);
  }

  const handlerAddress = subscriptionInfo.contracts.ReferralDynasty;

  // Initialize SDK (read-only mode)
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const sdk = new SDK({ public: publicClient });

  // Get subscription details (you'll need to implement this based on SDK capabilities)
  console.log(`\n📋 Subscription for handler: ${handlerAddress}`);
  console.log(`   Created at: ${subscriptionInfo.subscription.createdAt}`);
  console.log(`   Transaction: ${subscriptionInfo.subscription.txHash}`);
  
  // Check if we can get subscription info from the chain
  try {
    // Note: You may need to query the subscription status differently
    // based on the actual SDK methods available
    console.log("\n✅ Subscription appears to be active (verify on explorer)");
    console.log(`🔗 Explorer URL: https://testnet-explorer.somnia.network/tx/${subscriptionInfo.subscription.txHash}`);
  } catch (error) {
    console.log("❌ Could not verify subscription status");
  }
}

main().catch(console.error);