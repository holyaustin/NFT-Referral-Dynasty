# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

🚀 Deploying Referral System to Somnia Testnet...
=================================================
📝 Deployer address: 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
💰 Balance: 38.690063972 STT

📦 Step 1: Deploying UserRegistry...
✅ UserRegistry deployed to: 0xD4922fEe27794A09075ECA7762D5DA88629e4D40

📦 Step 2: Deploying ReferralBadge...
✅ ReferralBadge deployed to: 0xdddDbbD1e990E7ea5a8716390a0Fb4e71BB210C1

📦 Step 3: Deploying ReferralDynasty...
   Using badge address: 0xdddDbbD1e990E7ea5a8716390a0Fb4e71BB210C1
✅ ReferralDynasty deployed to: 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B

📦 Step 4: Transferring badge ownership to dynasty...
   Before - Badge owner: 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
   After  - Badge owner: 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B
✅ Ownership transferred successfully

📦 Step 5: Setting UserRegistry as trusted emitter...
✅ Registry trusted: true

📦 Step 6: Funding reward pool with 0.1 ETH...
✅ Reward pool funded. Balance: 0.1 ETH

📋 DEPLOYMENT SUMMARY
====================
UserRegistry     : 0xD4922fEe27794A09075ECA7762D5DA88629e4D40
ReferralBadge    : 0xdddDbbD1e990E7ea5a8716390a0Fb4e71BB210C1
ReferralDynasty  : 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B
Badge owner      : 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B
Dynasty owner    : 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
Trusted emitter  : true

📄 Deployment info saved to deployment-referral-system.json

📋 NEXT STEPS
============
1. Create a reactivity subscription using the SDK:
   - Handler: 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B
   - Emitter: 0xD4922fEe27794A09075ECA7762D5DA88629e4D40
   - Event: UserRegistered(address,address)

2. Run the subscription script to start receiving events


# 🚀 Setting up Reactivity Subscription...
==========================================
📋 Contract Addresses:
   Handler (ReferralDynasty): 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B
   Emitter (UserRegistry): 0xD4922fEe27794A09075ECA7762D5DA88629e4D40

💰 Checking account balance...
   Account: 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
   Balance: 38.3672 SOM
✅ Sufficient balance for subscription.

🔌 Initializing SDK...
📡 Event Configuration:
   Event Signature: UserRegistered(address,address)
   Event Topic: 0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850
   Emitter: 0xD4922fEe27794A09075ECA7762D5DA88629e4D40

📦 Creating subscription with params:
{
  "handlerContractAddress": "0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B",
  "priorityFeePerGas": "2000000000",
  "maxFeePerGas": "10000000000",
  "gasLimit": "500000",
  "isGuaranteed": true,
  "isCoalesced": false,
  "emitter": "0xD4922fEe27794A09075ECA7762D5DA88629e4D40",
  "eventTopics": [
    "0x2138b9314634f9fdd5e49bee3eaf17ca557b6637524d0db759711c3bfcd3d850"
  ]
}

⏳ Sending transaction to create subscription...
✅ Subscription created successfully!
📝 Transaction Hash: 0x2bf2a66a0b11b0d80fe0307fc542e92780ceea63247f2415b2b96ef4f0399a20

⏳ Waiting for transaction confirmation...
✅ Transaction confirmed in block 333158306
   Gas used: 303320
📄 Subscription info saved to subscription-info.json

🎉 Subscription setup complete!

📋 Next steps (from guide):
   1. Test the callback by registering a new user
   2. Check ReferralDynasty for events using an explorer
   3. Monitor logs to see _onEvent execution

💡 To test:
   - Trigger UserRegistered event from 0xD4922fEe27794A09075ECA7762D5DA88629e4D40
   - Check 0x014C89D40aAC6E40570e2cdEBbE99C65a204F70B for reactions

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using `mocha` and ethers.js
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
