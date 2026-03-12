# 👑 NFT Referral Dynasty

A revolutionary referral system where users earn **evolving NFT badges** and **instant cascading rewards** powered by Somnia Reactivity. Every referral triggers on-chain reactions - badges evolve, rewards distribute, and the leaderboard updates in real-time.

## ✨ Features

- **Dynamic NFT Badges** - Badges evolve from Bronze → Silver → Gold → Platinum as referrals grow
- **Instant Cascading Rewards** - Earn from your entire downline (5 levels deep) in the same block
- **Real-time Updates** - Watch badges evolve and leaderboards update live via WebSocket
- **Hybrid Reactivity** - On-chain for critical paths, off-chain SDK for rich UX

## 🏗️ Architecture
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Smart Contract│────▶│ Reactivity │────▶│ Frontend │
│ (Hardhat) │ │ - On-chain │ │ (Next.js 16) │
└─────────────────┘ │ - Off-chain SDK │ └─────────────────┘
│ └──────────────────┘ │
│ │ │
▼ ▼ ▼
[Referrals] [Art Generation] [Live Dashboard]
[Rewards] [Leaderboard] [Badge Gallery]
[Badges] [Notifications] [Animations]

text

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- Yarn or npm
- Somnia Testnet Wallet with STT tokens

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/nft-referral-dynasty.git
cd nft-referral-dynasty

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your private key and RPC URLs
Smart Contract Deployment
bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Somnia testnet
npx hardhat run scripts/deploy.ts --network somniaTestnet
Frontend Development
bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
📁 Project Structure
text
nft-referral-dynasty/
├── contracts/                 # Solidity smart contracts
├── test/                      # Mocha tests
├── scripts/                   # Deployment scripts
├── frontend/                  # Next.js application
│   ├── app/
│   │   ├── api/               # Next.js API routes
│   │   │   └── reactivity/    # Reactivity SDK endpoints
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities
│   │   └── page.tsx            # Main page
│   ├── public/                  # Static assets
│   └── ...
├── hardhat.config.ts           # Hardhat configuration
└── package.json
🔧 Technology Stack
Blockchain: Somnia Testnet

Smart Contracts: Solidity ^0.8.20, Hardhat v3

Testing: Mocha, Ethers v6

Reactivity: @somnia-chain/reactivity (on-chain + off-chain)

Frontend: Next.js 16 (App Router), TailwindCSS v4

Real-time: WebSocket (ws)

Wallet: ConnectKit, Wagmi, Viem

🎯 How It Works
1. User Registration
User mints their genesis badge

Referral links generated

Entry in referral tree

2. Reactive Events
When a referred user trades:

🔷 On-chain: Rewards cascade up 5 levels instantly

🔷 On-chain: Badge tier updates automatically

🔷 Off-chain SDK: Generates new badge artwork

🔷 Off-chain SDK: Updates leaderboard

🔷 Frontend: Real-time WebSocket updates

3. Reward Distribution
Level 1: 10% of trade fees

Level 2: 5% of trade fees

Level 3: 2.5% of trade fees

Level 4: 1.25% of trade fees

Level 5: 0.625% of trade fees

📊 Demo Video
https://img.youtube.com/vi/.../0.jpg

🏆 Why This Wins
Criteria	How We Excel
Technical Excellence	Hybrid on-chain/off-chain reactivity
Real-Time UX	Badges evolve instantly, rewards same block
Somnia Integration	Full Reactivity SDK utilization
Potential Impact	Ready for any dApp to integrate
📝 License
MIT

🙏 Acknowledgments
Somnia Team for Reactivity

OpenZeppelin for contract standards