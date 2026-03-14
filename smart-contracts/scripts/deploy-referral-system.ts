import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";

async function main() {
  // Connect to network (Hardhat v3 pattern)
  const { ethers: hreEthers } = await hre.network.connect();
  
  console.log("🚀 Deploying Referral System to Somnia Testnet...");
  console.log("=================================================");
  
  const [deployer] = await hreEthers.getSigners();
  console.log("📝 Deployer address:", deployer.address);
  
  const balance = await hreEthers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "STT");
  console.log("");

  // ─── Step 1: Deploy UserRegistry ─────────────────────────────────────────
  console.log("📦 Step 1: Deploying UserRegistry...");
  const RegistryFactory = await hreEthers.getContractFactory("UserRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  
  const registryAddress = await registry.getAddress();
  console.log("✅ UserRegistry deployed to:", registryAddress);
  console.log("");

  // ─── Step 2: Deploy ReferralBadge ────────────────────────────────────────
  console.log("📦 Step 2: Deploying ReferralBadge...");
  const BadgeFactory = await hreEthers.getContractFactory("ReferralBadge");
  const badge = await BadgeFactory.deploy();
  await badge.waitForDeployment();
  
  const badgeAddress = await badge.getAddress();
  console.log("✅ ReferralBadge deployed to:", badgeAddress);
  console.log("");

  // ─── Step 3: Deploy ReferralDynasty ──────────────────────────────────────
  console.log("📦 Step 3: Deploying ReferralDynasty...");
  console.log("   Using badge address:", badgeAddress);
  
  const DynastyFactory = await hreEthers.getContractFactory("ReferralDynasty");
  const dynasty = await DynastyFactory.deploy(badgeAddress);
  await dynasty.waitForDeployment();
  
  const dynastyAddress = await dynasty.getAddress();
  console.log("✅ ReferralDynasty deployed to:", dynastyAddress);
  console.log("");

  // ─── Step 4: Transfer badge ownership to dynasty ─────────────────────────
  console.log("📦 Step 4: Transferring badge ownership to dynasty...");
  console.log(`   Before - Badge owner: ${await badge.owner()}`);
  
  const transferTx = await badge.transferOwnership(dynastyAddress);
  await transferTx.wait();
  
  console.log(`   After  - Badge owner: ${await badge.owner()}`);
  console.log("✅ Ownership transferred successfully");
  console.log("");

  // ─── Step 5: Set registry as trusted emitter ─────────────────────────────
  console.log("📦 Step 5: Setting UserRegistry as trusted emitter...");
  const setTrustedTx = await dynasty.setTrustedEmitter(registryAddress, true);
  await setTrustedTx.wait();
  
  console.log(`✅ Registry trusted: ${await dynasty.trustedEmitters(registryAddress)}`);
  console.log("");

  // ─── Step 6: Fund the reward pool ────────────────────────────────────────
  console.log("📦 Step 6: Funding reward pool with 0.1 ETH...");
  const fundTx = await dynasty.fundRewardPool({ value: ethers.parseEther("0.1") });
  await fundTx.wait();
  
  console.log(`✅ Reward pool funded. Balance: ${ethers.formatEther(await hreEthers.provider.getBalance(dynastyAddress))} ETH`);
  console.log("");

  // ─── Deployment Summary ───────────────────────────────────────────────────
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("====================");
  console.log("UserRegistry     :", registryAddress);
  console.log("ReferralBadge    :", badgeAddress);
  console.log("ReferralDynasty  :", dynastyAddress);
  console.log("Badge owner      :", await badge.owner());
  console.log("Dynasty owner    :", await dynasty.owner());
  console.log("Trusted emitter  :", await dynasty.trustedEmitters(registryAddress));
  console.log("");

  // ─── Save deployment info ─────────────────────────────────────────────────
  const deploymentInfo = {
    network: "somniaTestnet",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      UserRegistry: registryAddress,
      ReferralBadge: badgeAddress,
      ReferralDynasty: dynastyAddress,
    },
    ownership: {
      badgeOwner: await badge.owner(),
      dynastyOwner: await dynasty.owner(),
    },
    trustedEmitter: registryAddress,
  };
  
  // Use ES module import for fs
  fs.writeFileSync(
    "deployment-referral-system.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 Deployment info saved to deployment-referral-system.json");
  
  // ─── Next steps ───────────────────────────────────────────────────────────
  console.log("\n📋 NEXT STEPS");
  console.log("============");
  console.log("1. Create a reactivity subscription using the SDK:");
  console.log(`   - Handler: ${dynastyAddress}`);
  console.log(`   - Emitter: ${registryAddress}`);
  console.log(`   - Event: UserRegistered(address,address)`);
  console.log("\n2. Run the subscription script to start receiving events");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});