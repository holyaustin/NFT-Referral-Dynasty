import { createPublicClient, createWalletClient, http, Address, Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

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

async function main() {
  console.log("🧪 Testing UserRegistry Directly...");
  console.log("===================================");

  try {
    // Check if deployment file exists
    if (!fs.existsSync('./deployment-referral-system.json')) {
      throw new Error('deployment-referral-system.json not found. Please run deployment first.');
    }

    const deployment = JSON.parse(
      fs.readFileSync('./deployment-referral-system.json', 'utf-8')
    );

    // Validate deployment file
    if (!deployment.contracts?.UserRegistry) {
      throw new Error('UserRegistry address not found in deployment file');
    }

    // Check for private key
    if (!process.env.PRIVATE_KEY) {
      throw new Error("❌ PRIVATE_KEY not found in .env file");
    }

    // Ensure private key has 0x prefix
    const privateKey = (process.env.PRIVATE_KEY.startsWith('0x') 
      ? process.env.PRIVATE_KEY 
      : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;

    const account = privateKeyToAccount(privateKey);
    
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    });

    const registryAddress = deployment.contracts.UserRegistry as `0x${string}`;
    
    // FIX: Create a proper Address type for test user
    // Method 1: Use type assertion
    const testUser1 = '0x' + '1'.repeat(40) as `0x${string}`;
    
    // Method 2: Use Address type from viem
    const testUser2: Address = `0x${'1'.repeat(40)}`;
    
    // Method 3: Create a helper function
    const createTestAddress = (pattern: string = '1', length: number = 40): `0x${string}` => {
      return `0x${pattern.repeat(length)}` as `0x${string}`;
    };
    
    // Use whichever method you prefer
    const testUser = `0x${'1'.repeat(40)}` as `0x${string}`;
    
    const zeroAddress: Address = '0x0000000000000000000000000000000000000000';

    console.log(`\n📋 Testing UserRegistry at: ${registryAddress}`);
    console.log(`📋 Test user: ${testUser}`);
    console.log(`📋 Using account: ${account.address}`);

    // First, check if the contract exists
    console.log("\n🔍 Verifying contract deployment...");
    const code = await publicClient.getCode({ address: registryAddress });
    
    if (!code || code === '0x') {
      throw new Error(`❌ No contract found at ${registryAddress}`);
    }
    console.log("✅ Contract found!");

    // Check if user is already registered
    console.log("\n🔍 Checking registration status...");
    
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
      args: [testUser]
    });

    console.log(`📋 User registered before test: ${isRegistered}`);

    // Check referrer mapping
    console.log("\n🔍 Checking referrer mapping...");
    const referrer = await publicClient.readContract({
      address: registryAddress,
      abi: [{
        inputs: [{ name: "user", type: "address" }],
        name: "referrers",
        outputs: [{ type: "address" }],
        stateMutability: "view",
        type: "function"
      }],
      functionName: "referrers",
      args: [testUser]
    }) as Address;

    console.log(`📋 Current referrer: ${referrer === zeroAddress ? 'None' : referrer}`);

    if (!isRegistered) {
      console.log("\n📋 Attempting to register test user...");
      
      try {
        // Simulate the contract call first
        console.log("📋 Simulating transaction...");
        
        const { request } = await publicClient.simulateContract({
          address: registryAddress,
          abi: [{
            inputs: [{ name: "referrer", type: "address" }],
            name: "register",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }],
          functionName: "register",
          args: [account.address],
          account: account.address
        });

        // Send the transaction
        console.log("📋 Sending transaction...");
        const hash: Hash = await walletClient.writeContract(request);
        console.log(`✅ Transaction sent: ${hash}`);

        // Wait for confirmation
        console.log("📋 Waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash,
          confirmations: 1,
          timeout: 60_000 // 60 seconds timeout
        });
        
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`✅ Gas used: ${receipt.gasUsed}`);

        // Check if event was emitted
        if (receipt.logs && receipt.logs.length > 0) {
          console.log(`\n📋 Events emitted: ${receipt.logs.length}`);
          receipt.logs.forEach((log, i) => {
            console.log(`  Event ${i+1}:`);
            console.log(`    Address: ${log.address}`);
            console.log(`    Topics: ${log.topics.join(', ')}`);
            
            // Try to decode UserRegistered event
            if (log.topics.length >= 3) {
              console.log(`    → This appears to be a UserRegistered event`);
              console.log(`      New user: ${log.topics[1]}`);
              console.log(`      Referrer: ${log.topics[2]}`);
            }
          });

          // Verify registration after transaction
          console.log("\n🔍 Verifying registration after transaction...");
          const isRegisteredAfter = await publicClient.readContract({
            address: registryAddress,
            abi: [{
              inputs: [{ name: "user", type: "address" }],
              name: "registered",
              outputs: [{ type: "bool" }],
              stateMutability: "view",
              type: "function"
            }],
            functionName: "registered",
            args: [testUser]
          });

          console.log(`📋 User registered after test: ${isRegisteredAfter}`);
          
          if (isRegisteredAfter) {
            console.log("\n✅ TEST PASSED: User was successfully registered!");
          } else {
            console.log("\n❌ TEST FAILED: User was not registered despite transaction success");
          }

        } else {
          console.log("\n❌ No events were emitted by the transaction!");
          console.log("This suggests the transaction didn't trigger any events.");
        }

      } catch (error) {
        console.error("❌ Transaction failed:", getErrorMessage(error));
        
        // Provide more specific error information
        if (error instanceof Error) {
          if (error.message.includes('user rejected')) {
            console.log("\n⚠️ Transaction was rejected by user.");
          } else if (error.message.includes('insufficient funds')) {
            console.log("\n⚠️ Insufficient funds for gas.");
          } else if (error.message.includes('already registered')) {
            console.log("\n⚠️ This address is already registered.");
          } else {
            console.log("\n⚠️ Error type:", error.name);
          }
        }
      }
    } else {
      console.log("\nℹ️ Test user is already registered. No action needed.");
    }

    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ Test completed!");
    console.log("=".repeat(50));

  } catch (error) {
    console.error("\n❌ Fatal error:", getErrorMessage(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', getErrorMessage(error));
  process.exit(1);
});