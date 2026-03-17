import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🧪 Testing Full Flow...");
  console.log("=======================");

  const deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );

  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found");
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

  const registryAddress = deployment.contracts.UserRegistry as `0x${string}`;
  const badgeAddress = deployment.contracts.ReferralBadge as `0x${string}`;

  // Generate a new random user
  const privateKey = generatePrivateKey();
  const newUser = privateKeyToAccount(privateKey);
  console.log(`\n📋 New test user: ${newUser.address}`);

  // Fund the new user (need gas for registration)
  console.log("\n💰 Funding new user with 0.1 SOM...");
  const fundTx = await walletClient.sendTransaction({
    to: newUser.address,
    value: 100000000000000000n // 0.1 SOM
  });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });
  console.log(`✅ Funded. Tx: ${fundTx}`);

  // Check initial badge status
  console.log("\n🔍 Checking initial badge status...");
  const initialHasBadge = await publicClient.readContract({
    address: badgeAddress,
    abi: [{
      inputs: [{ name: "user", type: "address" }],
      name: "hasBadge",
      outputs: [{ type: "bool" }],
      stateMutability: "view",
      type: "function"
    }],
    functionName: "hasBadge",
    args: [newUser.address]
  });
  console.log(`   Has badge before registration: ${initialHasBadge}`);

  // Register the new user with your account as referrer
  console.log("\n📝 Registering new user...");
  
  const newUserWallet = createWalletClient({
    account: newUser,
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

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
    account: newUser
  });

  const hash = await newUserWallet.writeContract(request);
  console.log(`   Transaction sent: ${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Registered in block ${receipt.blockNumber}`);

  // Wait a bit for reactivity to process
  console.log("\n⏳ Waiting 10 seconds for reactivity...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check if badge was minted
  console.log("\n🔍 Checking final badge status...");
  const finalHasBadge = await publicClient.readContract({
    address: badgeAddress,
    abi: [{
      inputs: [{ name: "user", type: "address" }],
      name: "hasBadge",
      outputs: [{ type: "bool" }],
      stateMutability: "view",
      type: "function"
    }],
    functionName: "hasBadge",
    args: [newUser.address]
  });

  console.log(`   Has badge after registration: ${finalHasBadge}`);

  if (finalHasBadge) {
    console.log("\n✅✅✅ SUCCESS! Reactivity is working!");
    
    // Get badge details
    const badgeData = await publicClient.readContract({
      address: badgeAddress,
      abi: [{
        inputs: [{ name: "user", type: "address" }],
        name: "getUserBadge",
        outputs: [{
          type: "tuple",
          components: [
            { name: "tier", type: "uint8" },
            { name: "referralCount", type: "uint24" },
            { name: "lastUpdate", type: "uint256" }
          ]
        }],
        stateMutability: "view",
        type: "function"
      }],
      functionName: "getUserBadge",
      args: [newUser.address]
    });

    console.log(`   Badge tier: ${['Bronze', 'Silver', 'Gold', 'Platinum'][badgeData.tier]}`);
    console.log(`   Referral count: ${badgeData.referralCount}`);
  } else {
    console.log("\n❌❌❌ Reactivity still not working!");
  }
}

main().catch(console.error);