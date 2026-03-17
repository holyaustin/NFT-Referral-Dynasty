import { createPublicClient, http } from 'viem';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';

async function main() {
  console.log("🔍 Searching for your registration transaction...");
  console.log("=================================================");

  const deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const registryAddress = deployment.contracts.UserRegistry as `0x${string}`;
  const yourAddress = '0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16';

  console.log(`\n📋 Your address: ${yourAddress}`);
  console.log(`📋 Registry address: ${registryAddress}`);

  // Check if you are registered
  try {
    const isRegistered = await publicClient.readContract({
      address: registryAddress,
      abi: [{
        inputs: [{ name: "user", type: "address" }],
        name: "registered",
        outputs: [{ type: "bool" }],
        stateMutability: "view",
        type: "function"
      }],
      functionName: "registered",
      args: [yourAddress]
    });

    console.log(`\n📋 Are you registered? ${isRegistered}`);

    if (isRegistered) {
      console.log("\n✅ You ARE registered! This means your registration succeeded and the event WAS emitted.");
      console.log("\n🔍 The event exists, but we can't query it due to RPC block range limits.");
      console.log("\n📋 To see the event, you can:");
      console.log("1. Use the Somnia Explorer:");
      console.log(`   https://shannon-explorer.somnia.network/address/${registryAddress}`);
      console.log("\n2. Look for your transaction hash from the frontend console logs:");
      console.log("   0x8f9927885a497bda74aaac1dd445b227d998f44b8224376b57e30dd9e2f8387c");
      console.log("\n   Direct link:");
      console.log(`   https://shannon-explorer.somnia.network/tx/0x8f9927885a497bda74aaac1dd445b227d998f44b8224376b57e30dd9e2f8387c`);
    }
  } catch (error) {
    console.error("Error checking registration:", error);
  }
}

main().catch(console.error);