import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🧪 Testing User Registration Directly...");
  console.log("=========================================");

  // Load deployment
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
    [
      "function register(address referrer) external",
      "function registerDirect() external",
      "function registered(address) view returns (bool)",
      "function referrers(address) view returns (address)",
      "event UserRegistered(address indexed newUser, address indexed referrer)"
    ],
    wallet
  );

  console.log(`📋 Contract Address: ${await registry.getAddress()}`);
  console.log(`📋 Using account: ${wallet.address}`);
  console.log("");

  // Check if already registered
  const isRegistered = await registry.registered(wallet.address);
  console.log(`📊 Account registered: ${isRegistered}`);

  if (!isRegistered) {
    console.log("\n📦 Attempting direct registration...");
    try {
      const tx = await registry.registerDirect();
      console.log(`   Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Registration successful! Block: ${receipt?.blockNumber}`);
      
      // Verify registration
      const nowRegistered = await registry.registered(wallet.address);
      console.log(`   📊 Now registered: ${nowRegistered}`);
      
    } catch (error: any) {
      console.log(`   ❌ Registration failed:`, error.message);
      
      // Try to decode error
      if (error.data) {
        console.log(`   Error data:`, error.data);
      }
    }
  }

  // Test with a random new wallet
  console.log("\n📦 Testing with new random wallet...");
  const newWallet = ethers.Wallet.createRandom().connect(provider);
  console.log(`   New wallet: ${newWallet.address}`);
  
  try {
    // Fund the new wallet with a tiny amount for gas
    const fundTx = await wallet.sendTransaction({
      to: newWallet.address,
      value: ethers.parseEther("0.01")
    });
    await fundTx.wait();
    console.log(`   ✅ Funded with 0.01 STT`);

    // Register with referrer
    const registryWithNew = registry.connect(newWallet);
    const tx = await registryWithNew.register(wallet.address);
    console.log(`   Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Registration successful! Block: ${receipt?.blockNumber}`);
    
    // Verify
    const isNewRegistered = await registry.registered(newWallet.address);
    console.log(`   📊 New wallet registered: ${isNewRegistered}`);
    
    const referrer = await registry.referrers(newWallet.address);
    console.log(`   📊 Referrer: ${referrer}`);
    
  } catch (error: any) {
    console.log(`   ❌ Registration failed:`, error.message);
    
    // Check common issues
    if (error.message.includes("insufficient funds")) {
      console.log(`   ⚠️  Issue: New wallet has insufficient funds for gas`);
    } else if (error.message.includes("Already registered")) {
      console.log(`   ⚠️  Issue: Address already registered`);
    } else if (error.message.includes("Cannot self-refer")) {
      console.log(`   ⚠️  Issue: Cannot self-refer`);
    }
  }
}

main().catch(console.error);