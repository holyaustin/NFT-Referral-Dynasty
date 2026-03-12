import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying ReferralDynasty contract...");

  const ReferralDynasty = await ethers.getContractFactory("ReferralDynasty");
  const referralDynasty = await ReferralDynasty.deploy();
  
  await referralDynasty.waitForDeployment();
  
  const address = await referralDynasty.getAddress();
  console.log("✅ ReferralDynasty deployed to:", address);
  
  // Verify contract on explorer (optional)
  console.log("\n📝 Contract Address:", address);
  console.log("🔗 Explorer URL:", `https://testnet.somnia.network/address/${address}`);
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    contract: "ReferralDynasty",
    address: address,
    network: "somniaTestnet",
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📄 Deployment info saved to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});