import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🧪 Testing Reactivity Flow on Somnia Testnet...");
  console.log("================================================");

  // Load deployment info
  let deployment;
  try {
    deployment = JSON.parse(
      fs.readFileSync('./deployment-referral-system.json', 'utf-8')
    );
  } catch (error) {
    console.error("❌ deployment-referral-system.json not found. Run deploy script first.");
    process.exit(1);
  }

  // Connect to the actual Somnia testnet, not local network
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network');
  
  // Use the private key from env to create a wallet
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("🌐 Connected to Somnia Testnet");
  console.log(`   Deployer: ${wallet.address}`);
  console.log("");

  // Get contract instances with the connected wallet
  const registry = new ethers.Contract(
    deployment.contracts.UserRegistry,
    [
      "function register(address referrer) external",
      "function registerDirect() external",
      "function registered(address) view returns (bool)"
    ],
    wallet
  );

  const badge = new ethers.Contract(
    deployment.contracts.ReferralBadge,
    [
      "function hasBadge(address) view returns (bool)",
      "function getUserBadge(address) view returns (tuple(uint8 tier, uint24 referralCount, uint256 lastUpdate))",
      "function ownerOf(uint256) view returns (address)",
      "function balanceOf(address) view returns (uint256)"
    ],
    wallet
  );

  // Generate two new test accounts (these will be funded by the deployer)
  const referrerWallet = ethers.Wallet.createRandom().connect(provider);
  const newUserWallet = ethers.Wallet.createRandom().connect(provider);

  console.log("📋 Test Accounts (need testnet ETH):");
  console.log(`   Referrer: ${referrerWallet.address}`);
  console.log(`   New User: ${newUserWallet.address}`);
  console.log("");

  // Fund the test accounts from deployer (if you have sufficient balance)
  console.log("💰 Funding test accounts with 0.01 ETH each...");
  
  const fundAmount = ethers.parseEther("0.01");
  
  try {
    const fundReferrerTx = await wallet.sendTransaction({
      to: referrerWallet.address,
      value: fundAmount
    });
    await fundReferrerTx.wait();
    console.log(`   ✅ Referrer funded: ${fundAmount.toString()} wei`);

    const fundNewUserTx = await wallet.sendTransaction({
      to: newUserWallet.address,
      value: fundAmount
    });
    await fundNewUserTx.wait();
    console.log(`   ✅ New user funded: ${fundAmount.toString()} wei`);
  } catch (error) {
    console.log("   ⚠️  Could not fund test accounts. Make sure deployer has sufficient balance.");
  }
  console.log("");

  // Step 1: Register referrer (so they have a badge)
  console.log("1️⃣ Registering referrer...");
  try {
    const registerReferrerTx = await registry.connect(referrerWallet).register(wallet.address);
    await registerReferrerTx.wait();
    console.log("   ✅ Referrer registered and badge minted");
  } catch (error) {
    console.log("   ❌ Failed to register referrer:", error.message);
    process.exit(1);
  }

  // Step 2: Check referrer's badge
  console.log("\n2️⃣ Checking referrer's badge...");
  try {
    const hasBadge = await badge.hasBadge(referrerWallet.address);
    console.log(`   📊 Has badge: ${hasBadge}`);
    
    if (hasBadge) {
      const referrerBadge = await badge.getUserBadge(referrerWallet.address);
      console.log(`   📊 Referrer badge - tier: ${referrerBadge.tier}, count: ${referrerBadge.referralCount}`);
      
      // Get token ID and owner
      const tokenId = await badge.userTokenId(referrerWallet.address);
      const owner = await badge.ownerOf(tokenId);
      console.log(`   📊 Token ID: ${tokenId}, Owner: ${owner}`);
    }
  } catch (error) {
    console.log("   ❌ Could not check badge:", error.message);
  }

  // Step 3: Register new user with referrer
  console.log("\n3️⃣ Registering new user with referrer...");
  try {
    const registerNewTx = await registry.connect(newUserWallet).register(referrerWallet.address);
    await registerNewTx.wait();
    console.log("   ✅ New user registered");
  } catch (error) {
    console.log("   ❌ Failed to register new user:", error.message);
  }

  // Step 4: Wait a moment for reactivity to process
  console.log("\n⏳ Waiting 10 seconds for reactivity to process...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Step 5: Check results
  console.log("\n4️⃣ Checking results...");
  
  try {
    const newUserHasBadge = await badge.hasBadge(newUserWallet.address);
    console.log(`   📊 New user has badge: ${newUserHasBadge}`);
    
    if (newUserHasBadge) {
      const newUserBadge = await badge.getUserBadge(newUserWallet.address);
      console.log(`   📊 New user badge - tier: ${newUserBadge.tier}, count: ${newUserBadge.referralCount}`);
    }
  } catch (error) {
    console.log("   ❌ Could not check new user badge:", error.message);
  }

  try {
    const updatedReferrerBadge = await badge.getUserBadge(referrerWallet.address);
    console.log(`   📊 Referrer updated badge - tier: ${updatedReferrerBadge.tier}, count: ${updatedReferrerBadge.referralCount}`);
    
    if (updatedReferrerBadge.referralCount > 0) {
      console.log("   ✅ Referrer count increased! Reactivity working!");
    } else {
      console.log("   ❌ Referrer count did not increase. Check subscription.");
    }
  } catch (error) {
    console.log("   ❌ Could not check updated referrer badge:", error.message);
  }

  console.log("\n✅ Test complete!");
  console.log("\n📝 If reactivity didn't work, check:");
  console.log("   1. Subscription is active (run npm run subscription:check)");
  console.log("   2. Account has 32+ SOM balance");
  console.log("   3. Explorer for any errors: https://testnet-explorer.somnia.network");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});