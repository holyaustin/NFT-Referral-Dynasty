import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient, http } from 'viem';
import { somniaTestnet } from '@/lib/chain';
import { CONTRACT_ADDRESSES, REFERRAL_BADGE_ABI } from '@/lib/contract';
import { pinata } from '@/lib/pinata';

// Next.js 15+ requires params to be awaited
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    // Await the params in Next.js 15+
    const { tokenId } = await params;
    
    // Fetch badge data from contract
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(),
    });

    const badgeData = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.referralBadge,
      abi: REFERRAL_BADGE_ABI,
      functionName: 'getBadge',
      args: [BigInt(tokenId)],
    });

    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.referralBadge,
      abi: REFERRAL_BADGE_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    });

    // Get metadata from IPFS - properly type the result
    const tokenURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.referralBadge,
      abi: REFERRAL_BADGE_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    }) as string; // Type assertion to string

    // Validate that tokenURI is a string
    if (typeof tokenURI !== 'string') {
      console.error('tokenURI is not a string:', tokenURI);
      return NextResponse.json({
        tokenId,
        owner,
        badgeData,
        metadata: null,
        tokenURI: String(tokenURI), // Convert to string if possible
      });
    }

    // If tokenURI is an IPFS hash, fetch the metadata
    let metadata = null;
    if (tokenURI && tokenURI.startsWith('ipfs://')) {
      try {
        const cid = tokenURI.replace('ipfs://', '');
        const url = await pinata.gateways.public.convert(cid);
        const response = await fetch(url);
        
        if (response.ok) {
          metadata = await response.json();
        } else {
          console.error('IPFS fetch failed with status:', response.status);
        }
      } catch (ipfsError) {
        console.error('Error fetching IPFS metadata:', ipfsError);
        // Continue without metadata
      }
    }

    return NextResponse.json({
      tokenId,
      owner,
      badgeData,
      metadata,
      tokenURI,
    });
  } catch (error) {
    console.error('Error fetching badge:', error);
    return NextResponse.json(
      { error: 'Badge not found' },
      { status: 404 }
    );
  }
}