import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("💰 Checking Creator Balance...");
  console.log("=============================");

  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found");
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const balance = await publicClient.getBalance({ address: account.address });
  
  console.log(`\n📋 Creator address: ${account.address}`);
  console.log(`💰 Balance: ${Number(balance) / 1e18} SOM`);

  if (Number(balance) / 1e18 >= 32) {
    console.log("✅ Sufficient balance for subscription (32+ SOM)");
  } else {
    console.log("❌ Insufficient balance! Need at least 32 SOM");
    console.log("\n🔗 Get testnet SOM from faucet:");
    console.log("https://docs.somnia.network/developer/network-info");
  }
}

main().catch(console.error);