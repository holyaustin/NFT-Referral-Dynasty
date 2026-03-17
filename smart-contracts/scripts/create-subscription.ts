import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, parseGwei, keccak256, toHex, Address } from 'viem';
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

// Load deployment info
let deployment: any;
try {
  if (!fs.existsSync('./deployment-referral-system.json')) {
    throw new Error('deployment-referral-system.json not found. Please run deployment first.');
  }
  deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );
} catch (error) {
  console.error('❌ Failed to load deployment file:', getErrorMessage(error));
  process.exit(1);
}

async function main() {
  console.log("🚀 Setting up Reactivity Subscription...");
  console.log("==========================================");

  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error("❌ PRIVATE_KEY not found in .env file");
    }

    // Validate deployment contracts
    if (!deployment.contracts?.ReferralDynasty || !deployment.contracts?.UserRegistry) {
      throw new Error('❌ Required contract addresses not found in deployment file');
    }

    // Get contract addresses from deployment
    const handlerAddress = deployment.contracts.ReferralDynasty as Address;
    const emitterAddress = deployment.contracts.UserRegistry as Address;

    console.log("📋 Contract Addresses:");
    console.log(`   Handler (ReferralDynasty): ${handlerAddress}`);
    console.log(`   Emitter (UserRegistry): ${emitterAddress}`);
    console.log("");

    // Check account balance first (must have 32+ SOM)
    console.log("💰 Checking account balance...");
    
    // Ensure private key has 0x prefix (following guide pattern)
    const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
      ? process.env.PRIVATE_KEY as `0x${string}`
      : `0x${process.env.PRIVATE_KEY}` as `0x${string}`;
    
    const account = privateKeyToAccount(privateKey);
    
    // Initialize public client
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    });

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceInSOM = Number(balance) / 1e18;
    console.log(`   Account: ${account.address}`);
    console.log(`   Balance: ${balanceInSOM.toFixed(4)} SOM`);
    
    if (balanceInSOM < 32) {
      console.error("\n❌ Insufficient balance: Need at least 32 SOM");
      console.log("💡 Get testnet SOM from the faucet and try again.");
      process.exit(1);
    }
    console.log("✅ Sufficient balance for subscription.\n");

    // Initialize wallet client (following guide pattern)
    console.log("🔌 Initializing SDK...");
    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    });

    // Initialize SDK with the required clients (exactly as guide shows)
    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient
    });

    // Calculate event topic for UserRegistered using proper method
    const eventSignature = 'UserRegistered(address,address)';
    const userRegisteredTopic = keccak256(toHex(eventSignature));

    console.log("📡 Event Configuration:");
    console.log(`   Event Signature: ${eventSignature}`);
    console.log(`   Event Topic: ${userRegisteredTopic}`);
    console.log(`   Emitter: ${emitterAddress}`);

    // Prepare subscription data (following guide structure)
    const subData = {
      handlerContractAddress: handlerAddress,
      priorityFeePerGas: parseGwei('2'),
      maxFeePerGas: parseGwei('10'),
      gasLimit: 500_000n, // Adjust based on handler complexity
      isGuaranteed: true, // Retry on failure
      isCoalesced: false, // One call per event
      // Optional filters from the guide
      emitter: emitterAddress, // Filter to specific emitter
      eventTopics: [userRegisteredTopic] // Filter to specific event
    };

    console.log("\n📦 Creating subscription with params:");
    console.log(JSON.stringify(subData, (_, v) => 
      typeof v === 'bigint' ? v.toString() : v, 2
    ));

    // Create the subscription (exactly as guide shows)
    console.log("\n⏳ Sending transaction to create subscription...");
    const txHash = await sdk.createSoliditySubscription(subData);

    // Handle response as shown in guide
    if (txHash instanceof Error) {
      console.error('❌ Creation failed:', txHash.message);
      process.exit(1);
    } else {
      console.log('✅ Subscription created successfully!');
      console.log('📝 Transaction Hash:', txHash);
      
      // Wait for transaction confirmation
      console.log("\n⏳ Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1,
        timeout: 60_000
      });
      
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed}`);

      // Save subscription info
      const subscriptionInfo = {
        ...deployment,
        subscription: {
          txHash,
          blockNumber: receipt.blockNumber.toString(),
          handler: handlerAddress,
          emitter: emitterAddress,
          eventTopic: userRegisteredTopic,
          eventSignature,
          createdAt: new Date().toISOString(),
          status: 'active'
        }
      };
      
      fs.writeFileSync(
        'subscription-info.json',
        JSON.stringify(subscriptionInfo, null, 2)
      );
      console.log('📄 Subscription info saved to subscription-info.json');
      
      console.log("\n🎉 Subscription setup complete!");
      console.log("\n📋 Next steps (from guide):");
      console.log("   1. Test the callback by registering a new user");
      console.log("   2. Check ReferralDynasty for events using an explorer");
      console.log("   3. Monitor logs to see _onEvent execution");
      console.log("\n💡 To test:");
      console.log(`   - Trigger UserRegistered event from ${emitterAddress}`);
      console.log(`   - Check ${handlerAddress} for reactions`);
    }

  } catch (error) {
    console.error("\n❌ Subscription setup failed:", getErrorMessage(error));
    
    // Provide specific error information
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        console.log("\n💡 Tip: You need at least 32 SOM for the subscription.");
        console.log("   Get testnet SOM from the faucet.");
      } else if (error.message.includes('user rejected')) {
        console.log("\n💡 Tip: Transaction was rejected. Please try again.");
      } else if (error.message.includes('nonce')) {
        console.log("\n💡 Tip: Nonce issue. Try resetting your account in MetaMask.");
      } else if (error.message.includes('already exists')) {
        console.log("\n💡 Tip: Subscription may already exist for this handler/emitter pair.");
      }
    }
    
    process.exit(1);
  }
}

// Optional verification function (as suggested in guide)
async function verifySubscription(
  publicClient: ReturnType<typeof createPublicClient>,
  handlerAddress: Address,
  txHash: `0x${string}`
) {
  try {
    console.log("\n🔍 Verifying subscription...");
    
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    
    if (receipt.status === 'success') {
      console.log("✅ Transaction successful");
      
      // Check if any events were emitted
      if (receipt.logs.length > 0) {
        console.log(`📋 Events emitted: ${receipt.logs.length}`);
        receipt.logs.forEach((log, i) => {
          console.log(`   Event ${i+1}: ${log.topics[0]}`);
        });
      }
      
      return true;
    } else {
      console.log("❌ Transaction failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Verification failed:", getErrorMessage(error));
    return false;
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', getErrorMessage(error));
  process.exit(1);
});