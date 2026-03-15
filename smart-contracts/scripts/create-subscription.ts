import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, parseGwei } from 'viem';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// Load deployment info
const deployment = JSON.parse(
  fs.readFileSync('./deployment-referral-system.json', 'utf-8')
);

async function main() {
  console.log("🚀 Setting up Reactivity Subscription...");
  console.log("==========================================");

  // Validate environment
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }

  // Get contract addresses from deployment
  const handlerAddress = deployment.contracts.ReferralDynasty as `0x${string}`;
  const emitterAddress = deployment.contracts.UserRegistry as `0x${string}`;

  console.log("📋 Contract Addresses:");
  console.log(`   Handler (ReferralDynasty): ${handlerAddress}`);
  console.log(`   Emitter (UserRegistry): ${emitterAddress}`);
  console.log("");

  // Initialize SDK clients
  console.log("🔌 Initializing SDK...");
  
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

  // Calculate event topic for UserRegistered
  const userRegisteredTopic = '0x' + Buffer.from(
    'UserRegistered(address,address)'
  ).toString('hex').padStart(64, '0');

  console.log("📡 Event Topic:", userRegisteredTopic);

  // Prepare subscription data
  const subData = {
    handlerContractAddress: handlerAddress,
    priorityFeePerGas: parseGwei('2'),
    maxFeePerGas: parseGwei('10'),
    gasLimit: 500_000n,
    isGuaranteed: true,
    isCoalesced: false,
    emitter: emitterAddress,
    eventTopics: [userRegisteredTopic]
  };

  console.log("\n📦 Creating subscription with params:");
  console.log(JSON.stringify(subData, (_, v) => 
    typeof v === 'bigint' ? v.toString() : v, 2
  ));

  // Create the subscription
  console.log("\n⏳ Sending transaction...");
  const txHash = await sdk.createSoliditySubscription(subData);

  if (txHash instanceof Error) {
    console.error('❌ Creation failed:', txHash.message);
    process.exit(1);
  } else {
    console.log('✅ Subscription created!');
    console.log('📝 Transaction Hash:', txHash);
    
    // Save subscription info
    const subscriptionInfo = {
      ...deployment,
      subscription: {
        txHash,
        handler: handlerAddress,
        emitter: emitterAddress,
        eventTopic: userRegisteredTopic,
        createdAt: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(
      'subscription-info.json',
      JSON.stringify(subscriptionInfo, null, 2)
    );
    console.log('📄 Subscription info saved to subscription-info.json');
  }

  // Check account balance (must have 32+ SOM)
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`\n💰 Account balance: ${balance.toString()} wei (${Number(balance) / 1e18} SOM)`);
  
  if (Number(balance) / 1e18 < 32) {
    console.warn("⚠️  Warning: Account has less than 32 SOM. Subscription may fail.");
    console.warn("   Please ensure you have at least 32 SOM in your account.");
  } else {
    console.log("✅ Account has sufficient balance for subscription.");
  }
}

main().catch((error) => {
  console.error("❌ Subscription setup failed:", error);
  process.exitCode = 1;
});