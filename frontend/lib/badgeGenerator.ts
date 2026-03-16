import { pinata } from './pinata';

interface BadgeParams {
  tier: number;
  referralCount: number;
  tokenId: number;
  address: string;
}

const tierConfigs = [
  {
    name: 'Bronze',
    color: '#cd7f32',
    secondary: '#b87333',
    pattern: 'linear-gradient(135deg, #cd7f32 0%, #b87333 100%)',
  },
  {
    name: 'Silver',
    color: '#c0c0c0',
    secondary: '#a8a8a8',
    pattern: 'linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%)',
  },
  {
    name: 'Gold',
    color: '#ffd700',
    secondary: '#daa520',
    pattern: 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)',
  },
  {
    name: 'Platinum',
    color: '#e5e4e2',
    secondary: '#b5b5b5',
    pattern: 'linear-gradient(135deg, #e5e4e2 0%, #b5b5b5 100%)',
  },
];

export async function generateBadgeSVG(params: BadgeParams): Promise<string> {
  const config = tierConfigs[params.tier] || tierConfigs[0];
  const tierName = config.name;
  const tierColor = config.color;

  // Generate SVG badge
  const svg = `
    <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${config.color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${config.secondary};stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background -->
      <circle cx="250" cy="250" r="200" fill="url(#bgGradient)" filter="url(#glow)"/>
      
      <!-- Inner circle -->
      <circle cx="250" cy="250" r="160" fill="none" stroke="white" stroke-width="4" stroke-opacity="0.3"/>
      
      <!-- Tier icon -->
      <text x="250" y="200" font-size="80" text-anchor="middle" fill="white" font-family="Arial">${getTierIcon(params.tier)}</text>
      
      <!-- Tier name -->
      <text x="250" y="280" font-size="40" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${tierName}</text>
      
      <!-- Referral count -->
      <text x="250" y="340" font-size="30" text-anchor="middle" fill="white" font-family="Arial">${params.referralCount} referrals</text>
      
      <!-- Token ID -->
      <text x="250" y="400" font-size="20" text-anchor="middle" fill="white" font-family="monospace" opacity="0.7">#${params.tokenId}</text>
    </svg>
  `;

  return svg;
}

function getTierIcon(tier: number): string {
  const icons = ['🥉', '🥈', '🥇', '💎'];
  return icons[tier] || icons[0];
}

export async function uploadBadgeToIPFS(params: BadgeParams): Promise<string> {
  try {
    // Generate SVG
    const svg = await generateBadgeSVG(params);
    
    // Convert SVG to File
    const file = new File([svg], `badge-${params.tokenId}.svg`, { type: 'image/svg+xml' });
    
    // Upload to IPFS
    const upload = await pinata.upload.public.file(file);
    
    // Generate metadata
    const config = tierConfigs[params.tier] || tierConfigs[0];
    const metadata = {
      name: `Referral Dynasty Badge #${params.tokenId}`,
      description: `${config.name} tier badge with ${params.referralCount} referrals`,
      image: `ipfs://${upload.cid}`,
      attributes: [
        {
          trait_type: "Tier",
          value: config.name,
        },
        {
          trait_type: "Tier Level",
          value: params.tier,
        },
        {
          trait_type: "Referral Count",
          value: params.referralCount,
        },
        {
          trait_type: "Owner",
          value: params.address,
        },
      ],
    };

    // Upload metadata
    const metadataFile = new File(
      [JSON.stringify(metadata, null, 2)],
      `metadata-${params.tokenId}.json`,
      { type: 'application/json' }
    );
    
    const metadataUpload = await pinata.upload.public.file(metadataFile);
    
    return `ipfs://${metadataUpload.cid}`;
  } catch (error) {
    console.error('Error uploading badge to IPFS:', error);
    throw error;
  }
}