import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http } from 'viem';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🗑️  Cancelling Reactivity Subscription...");
  console.log("=======================================");

  const subscriptionInfo = JSON.parse(
    fs.readFileSync('./subscription-info.json', 'utf-8')
  );

  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient
  });

  // You'll need to get the subscription ID - this depends on SDK implementation
  // This is a placeholder - adjust based on actual SDK methods
  const subscriptionId = subscriptionInfo.subscription.id; 
  
  console.log(`\n📋 Cancelling subscription: ${subscriptionId}`);
  
  // const result = await sdk.cancelSoliditySubscription(subscriptionId);
  // console.log("✅ Subscription cancelled:", result);
  
  console.log("\n⚠️  Note: Subscription cancellation implementation depends on SDK");
  console.log("   Check the Somnia SDK documentation for exact method.");
}

main().catch(console.error);