# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.


# 📋 DEPLOYMENT SUMMARY
====================
UserRegistry     : 0xeEe3F77E4565C16873F8d26d199AE9deBAE7075D
ReferralBadge    : 0x569F46F0Dd4b274eAC5c32e5e68C7e5748B81c51
ReferralDynasty  : 0xf8Bf528252E4d53f9714E3a663c8a007043E8f5c
Badge owner      : 0xf8Bf528252E4d53f9714E3a663c8a007043E8f5c
Dynasty owner    : 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
Trusted emitter  : true

# 📄 Deployment info saved to deployment-referral-system.json

# 📋 NEXT STEPS
============
1. Create a reactivity subscription using the SDK:
   - Handler: 0xf8Bf528252E4d53f9714E3a663c8a007043E8f5c
   - Emitter: 0xeEe3F77E4565C16873F8d26d199AE9deBAE7075D
   - Event: UserRegistered(address,address)

2. Run the subscription script to start receiving events

# 🚀 Setting up Reactivity Subscription...
==========================================
📋 Contract Addresses:
   Handler (ReferralDynasty): 0xf8Bf528252E4d53f9714E3a663c8a007043E8f5c
   Emitter (UserRegistry): 0xeEe3F77E4565C16873F8d26d199AE9deBAE7075D

🔌 Initializing SDK...
📡 Event Topic: 0x00557365725265676973746572656428616464726573732c6164647265737329

📦 Creating subscription with params:
{
  "handlerContractAddress": "0xf8Bf528252E4d53f9714E3a663c8a007043E8f5c",
  "priorityFeePerGas": "2000000000",
  "maxFeePerGas": "10000000000",
  "gasLimit": "500000",
  "isGuaranteed": true,
  "isCoalesced": false,
  "emitter": "0xeEe3F77E4565C16873F8d26d199AE9deBAE7075D",
  "eventTopics": [
    "0x00557365725265676973746572656428616464726573732c6164647265737329"
  ]
}

⏳ Sending transaction...
✅ Subscription created!
📝 Transaction Hash: 0x2234087e0465a29d8b3fa1056df9c3812eef022978ead1876558399a25a7d747
📄 Subscription info saved to subscription-info.json

💰 Account balance: 39365246372000000000 wei (39.365246372 SOM)
✅ Account has sufficient balance for subscription.

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
