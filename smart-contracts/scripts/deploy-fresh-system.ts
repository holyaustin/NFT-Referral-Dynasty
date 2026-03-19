import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";

async function main() {
  const { ethers: hreEthers } = await hre.network.connect();
  
  console.log("🚀 Deploying Referral System to Somnia Testnet...");
  console.log("=================================================");
  
  const [deployer] = await hreEthers.getSigners();
  console.log("📝 Deployer address:", deployer.address);
  
  const balance = await hreEthers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "STT");
  console.log("");

  // Step 1: Deploy UserRegistry
  console.log("📦 Step 1: Deploying UserRegistry...");
  const RegistryFactory = await hreEthers.getContractFactory("UserRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ UserRegistry deployed to:", registryAddress);
  console.log("");

  // Step 2: Deploy ReferralBadge
  console.log("📦 Step 2: Deploying ReferralBadge...");
  const BadgeFactory = await hreEthers.getContractFactory("ReferralBadge");
  const badge = await BadgeFactory.deploy();
  await badge.waitForDeployment();
  const badgeAddress = await badge.getAddress();
  console.log("✅ ReferralBadge deployed to:", badgeAddress);
  console.log("");

  // Step 3: Deploy ReferralDynasty
  console.log("📦 Step 3: Deploying ReferralDynasty...");
  console.log("   Using badge address:", badgeAddress);
  const DynastyFactory = await hreEthers.getContractFactory("ReferralDynasty");
  const dynasty = await DynastyFactory.deploy(badgeAddress);
  await dynasty.waitForDeployment();
  const dynastyAddress = await dynasty.getAddress();
  console.log("✅ ReferralDynasty deployed to:", dynastyAddress);
  console.log("");

  // Step 4: Transfer badge ownership to dynasty
  console.log("📦 Step 4: Transferring badge ownership to dynasty...");
  console.log(`   Before - Badge owner: ${await badge.owner()}`);
  
  // Use type assertion to avoid TypeScript errors
  const badgeContract = badge as any;
  const transferTx = await badgeContract.transferOwnership(dynastyAddress);
  await transferTx.wait();
  
  console.log(`   After  - Badge owner: ${await badgeContract.owner()}`);
  console.log("✅ Ownership transferred successfully");
  console.log("");

  // Step 5: Set registry as trusted emitter
  console.log("📦 Step 5: Setting UserRegistry as trusted emitter...");
  const dynastyContract = dynasty as any;
  const setTrustedTx = await dynastyContract.setTrustedEmitter(registryAddress, true);
  await setTrustedTx.wait();
  console.log(`✅ Registry trusted: ${await dynastyContract.trustedEmitters(registryAddress)}`);
  console.log("");

  /*
  // Step 6: Fund the reward pool (optional)
  console.log("📦 Step 6: Funding reward pool with 0.001 ETH...");
  const fundTx = await dynastyContract.fundRewardPool({ value: ethers.parseEther("0.001") });
  await fundTx.wait();
  console.log(`✅ Reward pool funded. Balance: ${ethers.formatEther(await hreEthers.provider.getBalance(dynastyAddress))} ETH`);
  console.log("");
    */

  // Deployment Summary
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("====================");
  console.log("UserRegistry     :", registryAddress);
  console.log("ReferralBadge    :", badgeAddress);
  console.log("ReferralDynasty  :", dynastyAddress);
  console.log("Badge owner      :", await badgeContract.owner());
  console.log("Dynasty owner    :", await dynastyContract.owner());
  console.log("Trusted emitter  :", await dynastyContract.trustedEmitters(registryAddress));
  console.log("");

  // Save deployment info
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
      badgeOwner: await badgeContract.owner(),
      dynastyOwner: await dynastyContract.owner(),
    },
    trustedEmitter: registryAddress,
  };
  
  fs.writeFileSync("deployment-referral-system.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to deployment-referral-system.json");
  
  // Next steps
  console.log("\n📋 NEXT STEPS");
  console.log("============");
  console.log("1. Create a reactivity subscription:");
  console.log(`   npx hardhat run scripts/create-subscription-500k.ts --network somniaTestnet`);
  console.log("\n2. Test the flow:");
  console.log(`   npx hardhat run scripts/test-referral-flow.ts --network somniaTestnet`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});