import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🧪 Testing Reactivity Flow (Simple Version)...");
  console.log("===============================================");

  const deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );

  // Connect to Somnia testnet
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network');
  
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Contract instances
  const registry = new ethers.Contract(
    deployment.contracts.UserRegistry,
    ["function register(address referrer) external"],
    wallet
  );

  const badge = new ethers.Contract(
    deployment.contracts.ReferralBadge,
    [
      "function hasBadge(address) view returns (bool)",
      "function getUserBadge(address) view returns (tuple(uint8 tier, uint24 referralCount, uint256 lastUpdate))"
    ],
    wallet
  );

  // Use wallet itself as referrer and create a new random user
  const referrer = wallet.address;
  const newUser = ethers.Wallet.createRandom().address;

  console.log(`📋 Referrer: ${referrer}`);
  console.log(`📋 New User: ${newUser}`);
  console.log("");

  // Register new user (this will mint badge for newUser and update referrer)
  console.log("📦 Registering new user...");
  const tx = await registry.register(referrer);
  await tx.wait();
  console.log("✅ Transaction confirmed");

  // Check results
  console.log("\n📊 Checking results...");
  
  const hasBadge = await badge.hasBadge(newUser);
  console.log(`   New user has badge: ${hasBadge}`);

  const referrerBadge = await badge.getUserBadge(referrer);
  console.log(`   Referrer count: ${referrerBadge.referralCount}`);
  console.log(`   Referrer tier: ${referrerBadge.tier}`);

  console.log("\n✅ Test complete!");
}

main().catch(console.error);