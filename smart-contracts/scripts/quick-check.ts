import { createPublicClient, http, Address } from 'viem';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';

// Type guard for error handling
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

async function main() {
  console.log("🔍 Quick Reactivity Check...");
  console.log("===========================");

  try {
    // Check if deployment file exists
    if (!fs.existsSync('./deployment-referral-system.json')) {
      throw new Error('deployment-referral-system.json not found. Please run deployment first.');
    }

    const deployment = JSON.parse(
      fs.readFileSync('./deployment-referral-system.json', 'utf-8')
    );

    // Validate deployment file structure
    if (!deployment.contracts?.UserRegistry || !deployment.contracts?.ReferralDynasty) {
      throw new Error('Invalid deployment file: missing contract addresses');
    }

    const registryAddress = deployment.contracts.UserRegistry as Address;
    const dynastyAddress = deployment.contracts.ReferralDynasty as Address;

    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    });

    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 1000n > 0n ? currentBlock - 1000n : 0n;

    console.log(`\n📋 Current block: ${currentBlock}`);
    console.log(`📋 Checking last 1000 blocks (${fromBlock} to ${currentBlock})`);

    // Check if emitter is trusted
    try {
      console.log(`\n🔍 Checking trusted emitter status...`);
      
      const isTrusted = await publicClient.readContract({
        address: dynastyAddress,
        abi: [{
          inputs: [{ name: "emitter", type: "address" }],
          name: "trustedEmitters",
          outputs: [{ type: "bool" }],
          stateMutability: "view",
          type: "function"
        }],
        functionName: "trustedEmitters",
        args: [registryAddress]
      });

      console.log(`\n📋 Emitter trusted: ${isTrusted}`);

      if (!isTrusted) {
        console.log("\n❌ CRITICAL: Emitter is NOT trusted!");
        console.log("\n📝 Run these commands to fix:");
        console.log("----------------------------------------");
        console.log(`npx hardhat console --network somniaTestnet`);
        console.log(`const dynasty = await ethers.getContractAt("ReferralDynasty", "${dynastyAddress}")`);
        console.log(`await dynasty.setTrustedEmitter("${registryAddress}", true)`);
        console.log("----------------------------------------");
        return;
      } else {
        console.log("✅ Emitter is trusted - good!");
      }
    } catch (error) {
      console.log("❌ Could not check trusted status:", getErrorMessage(error));
      
      // Check if it's a contract read error (maybe function doesn't exist)
      if (isError(error) && error.message.includes('execution reverted')) {
        console.log("\nℹ️ The trustedEmitters function may not exist in this contract version.");
        console.log("   Skipping trusted emitter check...");
      }
    }

    // Check for recent events
    try {
      console.log(`\n🔍 Checking for recent events in ReferralDynasty...`);
      
      const logs = await publicClient.getLogs({
        address: dynastyAddress,
        fromBlock: fromBlock,
        toBlock: 'latest',
      });

      console.log(`\n📋 Recent events in ReferralDynasty: ${logs.length}`);

      if (logs.length === 0) {
        console.log("\n❌ No recent events - Reactivity may not be working");
        console.log("\n🔍 Possible issues:");
        console.log("   1. Subscription not created");
        console.log("   2. Insufficient SOM balance (need 32+ SOM)");
        console.log("   3. Gas parameters too low");
        console.log("   4. No user registrations occurred in this period");
        
        // Check if there are any UserRegistry events first
        try {
          const registryLogs = await publicClient.getLogs({
            address: registryAddress,
            fromBlock: fromBlock,
            toBlock: 'latest',
          });
          
          console.log(`\n📋 UserRegistry events in same period: ${registryLogs.length}`);
          
          if (registryLogs.length > 0) {
            console.log("✅ UserRegistry events found but not processed by Dynasty");
            console.log("   → Reactivity subscription issue confirmed");
          } else {
            console.log("ℹ️ No UserRegistry events either - no registrations occurred");
          }
        } catch (registryError) {
          console.log("Could not check UserRegistry events:", getErrorMessage(registryError));
        }
      } else {
        console.log("\n✅ Events found - Reactivity is working!");
        console.log("\n📋 Recent transactions:");
        logs.slice(-3).forEach((log, index) => {
          console.log(`   ${index + 1}. Tx: ${log.transactionHash}`);
          console.log(`      Block: ${log.blockNumber}`);
        });
        
        // Show summary
        console.log(`\n📊 Summary:`);
        console.log(`   Total events: ${logs.length}`);
        console.log(`   Time range: Last ${logs.length > 0 ? '~' + (Number(currentBlock) - Number(fromBlock)) + ' blocks' : 'N/A'}`);
      }
    } catch (error) {
      console.error("❌ Error checking events:", getErrorMessage(error));
      
      // Provide more specific error information
      if (isError(error)) {
        if (error.message.includes('rate limit')) {
          console.log("\n⚠️ RPC rate limit hit. Try reducing the block range or waiting a moment.");
        } else if (error.message.includes('timeout')) {
          console.log("\n⚠️ Request timeout. The RPC might be slow or unavailable.");
        } else {
          console.log("\n⚠️ Error type:", error.name);
        }
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ Reactivity check completed!");
    console.log("=".repeat(50));

  } catch (error) {
    console.error("\n❌ Fatal error:", getErrorMessage(error));
    
    if (isError(error)) {
      console.error("Error name:", error.name);
      console.error("Stack:", error.stack);
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', getErrorMessage(error));
  process.exit(1);
});