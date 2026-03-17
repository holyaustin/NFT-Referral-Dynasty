import { createPublicClient, http } from 'viem';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';

async function main() {
  console.log("🔍 Checking if you have a badge...");
  console.log("==================================");

  const deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const badgeAddress = deployment.contracts.ReferralBadge as `0x${string}`;
  const yourAddress = '0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16';

  console.log(`\n📋 Your address: ${yourAddress}`);
  console.log(`📋 Badge contract: ${badgeAddress}`);

  try {
    // Check if you have a badge
    const hasBadge = await publicClient.readContract({
      address: badgeAddress,
      abi: [{
        inputs: [{ name: "user", type: "address" }],
        name: "hasBadge",
        outputs: [{ type: "bool" }],
        stateMutability: "view",
        type: "function"
      }],
      functionName: "hasBadge",
      args: [yourAddress]
    });

    console.log(`\n📋 Do you have a badge? ${hasBadge}`);

    if (hasBadge) {
      // Get badge data
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
        args: [yourAddress]
      });

      console.log("\n✅ Your Badge Details:");
      console.log(`   Tier: ${['Bronze', 'Silver', 'Gold', 'Platinum'][badgeData.tier]}`);
      console.log(`   Referral Count: ${badgeData.referralCount}`);
      console.log(`   Last Update: ${new Date(Number(badgeData.lastUpdate) * 1000).toLocaleString()}`);

      // Get token ID
      const tokenId = await publicClient.readContract({
        address: badgeAddress,
        abi: [{
          inputs: [{ name: "user", type: "address" }],
          name: "userTokenId",
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
          type: "function"
        }],
        functionName: "userTokenId",
        args: [yourAddress]
      });

      console.log(`\n📋 Your Badge Token ID: ${tokenId}`);
      console.log(`🔗 Explorer: https://testnet-explorer.somnia.network/token/${badgeAddress}?a=${tokenId}`);
    } else {
      console.log("\n❌ You don't have a badge yet.");
      console.log("This would indicate reactivity isn't working despite the registration.");
    }
  } catch (error) {
    console.error("Error checking badge:", error);
  }
}

main().catch(console.error);