# 👑 NFT Referral Dynasty

A revolutionary referral system where users earn **evolving NFT badges** and **instant rewards** powered by Somnia Reactivity. Every referral triggers on-chain reactions - badges evolve automatically and rewards are distributed in real-time.

## 🏆 **Hackathon Submission** - Somnia Reactivity Mini Hackathon

**Live Demo:** [https://nft-referral-dynasty.vercel.app/](https://nft-referral-dynasty.vercel.app)
**Project Video:** [Watch Demo](https://youtu.be/ambcJknx6iE)

---

## ✨ Features

- **Dynamic NFT Badges** - Badges evolve from Bronze → Silver → Gold based on referral count (thresholds: 2, 5, 20)
- **Instant On-Chain Reactions** - Badges minted automatically when users register via Reactivity
- **Real-time Updates** - Watch badges evolve and leaderboard update live
- **Somnia Reactivity** - Pure on-chain event-driven architecture
- **Gas Optimized** - Efficient contract design with minimal storage operations

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  UserRegistry   │────▶│    Reactivity    │────▶│ReferralDynasty  │
│  (Event Emitter)│     │     System       │     │   (Handler)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                                                           ▼
                                                    ┌─────────────┐
                                                    │ReferralBadge│
                                                    │   (NFT)     │
                                                    └─────────────┘
```

### Contract Architecture (3-Contract Separation)

| Contract | Purpose | Key Events |
|----------|---------|------------|
| **UserRegistry** | Emits registration events | `UserRegistered(address,address)` |
| **ReferralDynasty** | Reactive handler, processes referrals | `ReferralProcessed`, `MintFailed` |
| **ReferralBadge** | ERC721 NFT with tier evolution | `BadgeMinted`, `BadgeUpgraded` |

## 🚀 Live Contract Addresses (Somnia Testnet)

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| **UserRegistry** | `0x60f79962Ed084E6c41866f2E9C8c7482808064B3` | [View](https://shannon-explorer.somnia.network/address/0x60f79962Ed084E6c41866f2E9C8c7482808064B3) |
| **ReferralBadge** | `0x5dd3fec607Ea107aC7AF726fA09f69BBE06a344a` | [View](https://shannon-explorer.somnia.network/address/0x5dd3fec607Ea107aC7AF726fA09f69BBE06a344a) |
| **ReferralDynasty** | `0xb7395bC4Bc6985Bb2465fBdd8C80A0888d143511` | [View](https://shannon-explorer.somnia.network/address/0xb7395bC4Bc6985Bb2465fBdd8C80A0888d143511) |

**Event Topic:** `0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850` (UserRegistered)

## 🔧 Technology Stack

### Smart Contracts
- **Language:** Solidity ^0.8.30
- **Framework:** Hardhat v3
- **Testing:** Forge (Solidity tests) + Mocha/Chai (TypeScript tests)
- **Reactivity:** `@somnia-chain/reactivity-contracts`
- **Libraries:** OpenZeppelin (ERC721, Ownable, ReentrancyGuard)

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** TailwindCSS v4 with Purple/Black theme
- **Wallet:** ConnectKit + Wagmi + Viem
- **Real-time:** WebSocket for live updates
- **IPFS:** Pinata SDK for badge metadata

## 📁 Project Structure

```
nft-referral-dynasty/
├── contracts/                    # Solidity smart contracts
│   ├── UserRegistry.sol          # Event emitter contract
│   ├── ReferralBadge.sol         # ERC721 NFT contract
│   ├── ReferralDynasty.sol       # Reactive handler contract
│   └── test/                     # Test wrappers
├── test/                         # Test files
│   ├── UserRegistry.t.sol        # Forge tests
│   ├── ReferralBadge.t.sol
│   ├── ReferralDynasty.t.sol
│   └── ReferralDynasty.ts        # TypeScript tests
├── scripts/                      # Deployment & utility scripts
│   ├── deploy-referral-system.ts
│   ├── create-subscription.ts
│   ├── test-referral-flow.ts
│   └── verify-deployment.ts
├── frontend/                     # Next.js application
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── dashboard/            # User dashboard
│   │   ├── badges/               # Badge gallery
│   │   ├── leaderboard/          # Top referrers
│   │   ├── profile/[address]/    # Public profiles
│   │   └── register/             # Registration page
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities & contract ABIs
│   └── public/                   # Static assets
├── hardhat.config.ts             # Hardhat configuration
└── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- npm or yarn
- Somnia Testnet Wallet with 32+ STT tokens

### Smart Contract Deployment

```bash
# Clone repository
git clone https://github.com/holyaustin/nft-referral-dynasty.git
cd nft-referral-dynasty/smart-contracts

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Somnia testnet
npx hardhat run scripts/deploy-referral-system.ts --network somniaTestnet

# Create reactivity subscription
npx hardhat run scripts/create-subscription.ts --network somniaTestnet

# Test the full flow
npx hardhat run scripts/test-referral-flow.ts --network somniaTestnet
```

### Frontend Development

```bash
cd frontend
cp .env.example .env.local
# Add contract addresses and API keys

npm install
npm run dev
```

Visit `http://localhost:3000`

## 🎯 How It Works

### 1. **User Registration**
```solidity
// User calls register() with referrer address
registry.register(referrerAddress);

// UserRegistry emits event
emit UserRegistered(msg.sender, referrer);
```

### 2. **Reactive Minting**
```solidity
// Somnia Reactivity calls ReferralDynasty._onEvent()
function _onEvent(address emitter, bytes32[] calldata topics, bytes calldata) {
    address newUser = address(uint160(uint256(topics[1])));
    address referrer = address(uint160(uint256(topics[2])));
    
    // Mint badge automatically
    badge.mint(newUser);
}
```

### 3. **Badge Evolution**
| Tier | Referrals Required |
|------|-------------------|
| Bronze | 0-2 |
| Silver | 3-5 |
| Gold | 6-20 |


## 📊 Demo Video

[![Referral Dynasty Demo](https://img.youtube.com/vi/your-video-id/0.jpg)](https://youtu.be/your-video-id)

## 🏆 Why This Wins

| Criteria | Our Approach |
|----------|--------------|
| **Technical Excellence** | Clean 3-contract separation, no inheritance conflicts, optimized gas usage |
| **Real-Time UX** | Badges minted automatically via Reactivity, no waiting or claims |
| **Somnia Integration** | Full on-chain Reactivity with proper event topic alignment |
| **Potential Impact** | Ready-to-use referral system for any dApp |

## 🔍 Key Innovations

1. **Three-Contract Architecture** - Solved inheritance conflicts between ERC721 and SomniaEventHandler
2. **Event Topic Verification** - Ensured correct `UserRegistered` event format with indexed parameters
3. **Soft-Fail Error Handling** - Emits `MintFailed` events instead of reverting
4. **Gas Optimized** - Minimal storage operations, unchecked math where safe

## 📝 Environment Variables

### Smart Contracts (`.env`)
```env
PRIVATE_KEY=your_private_key
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
```

## 🧪 Testing

```bash
# Run Solidity tests
forge test

# Run TypeScript tests
npx hardhat test

# Test specific flow
npx hardhat run scripts/test-referral-flow.ts --network somniaTestnet
```

## 📄 License

MIT

## 🙏 Acknowledgments

- **Somnia Team** for the Reactivity SDK and testnet support
- **OpenZeppelin** for secure contract standards
- **Hardhat** for the development environment
- **ConnectKit** for wallet integration

## 📞 Contact

- **Project Lead:** [Augustine](https://twitter.com/holyaustin)
- **GitHub:** [https://github.com/holyaustine/nft-referral-dynasty](https://github.com/holyaustin/nft-referral-dynasty)
- **Demo Video:** [YouTube Link](https://youtu.be/your-video)

---

**Built with ❤️ for the Somnia Reactivity Hackathon**