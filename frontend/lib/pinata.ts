"server only";

import { PinataSDK } from "pinata";

export const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL!,
});

// Helper to generate badge image metadata
export async function generateBadgeMetadata(
  tokenId: number,
  tier: number,
  referralCount: number,
  imageUrl: string
) {
  const tierNames = ["Bronze", "Silver", "Gold", "Platinum"];
  const tierColors = ["#cd7f32", "#c0c0c0", "#ffd700", "#e5e4e2"];
  
  const metadata = {
    name: `Referral Dynasty Badge #${tokenId}`,
    description: `${tierNames[tier]} tier badge with ${referralCount} referrals`,
    image: imageUrl,
    attributes: [
      {
        trait_type: "Tier",
        value: tierNames[tier],
      },
      {
        trait_type: "Tier Level",
        value: tier,
      },
      {
        trait_type: "Referral Count",
        value: referralCount,
      },
      {
        trait_type: "Color",
        value: tierColors[tier],
      },
    ],
  };
  
  return metadata;
}