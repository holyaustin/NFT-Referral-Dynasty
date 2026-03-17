import { createPublicClient, http } from 'viem';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';

async function main() {
  console.log("🔍 Verifying Contract Events...");
  console.log("===============================");

  const deployment = JSON.parse(
    fs.readFileSync('./deployment-referral-system.json', 'utf-8')
  );

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
  });

  const registryAddress = deployment.contracts.UserRegistry as `0x${string}`;

  console.log(`\n📋 Checking UserRegistry at: ${registryAddress}`);

  // Get the contract bytecode to verify it's deployed
  const bytecode = await publicClient.getBytecode({ address: registryAddress });
  console.log(`\n📋 Contract deployed: ${bytecode ? 'YES' : 'NO'}`);

  if (!bytecode) {
    console.log("❌ Contract not found at this address!");
    return;
  }

  // Try to get the contract's past transactions
  console.log("\n📋 Fetching recent transactions...");
  
  const currentBlock = await publicClient.getBlockNumber();
  const fromBlock = currentBlock - 10000n;
  
  // Get all logs from this contract (without filtering by event)
  try {
    const logs = await publicClient.getLogs({
      address: registryAddress,
      fromBlock: fromBlock,
      toBlock: 'latest',
    });

    console.log(`\n📋 Total logs found: ${logs.length}`);

    if (logs.length > 0) {
      console.log("\n📋 Recent logs:");
      logs.slice(-5).forEach((log, i) => {
        console.log(`\n  Log ${i+1}:`);
        console.log(`    Tx: ${log.transactionHash}`);
        console.log(`    Topics: ${log.topics.join(', ')}`);
        console.log(`    Data: ${log.data}`);
      });

      // Check if any log matches UserRegistered event
      const userRegisteredTopic = '0x' + Buffer.from('UserRegistered(address,address)').toString('hex').padStart(64, '0');
      const hasUserRegistered = logs.some(log => log.topics[0] === userRegisteredTopic);
      
      console.log(`\n📋 Contains UserRegistered events: ${hasUserRegistered ? 'YES' : 'NO'}`);
      
      if (!hasUserRegistered) {
        console.log("\n❌ Your contract is NOT emitting UserRegistered events!");
        console.log("\n🔧 Fix: Check your UserRegistry.sol - make sure it has:");
        console.log('   event UserRegistered(address indexed newUser, address indexed referrer);');
        console.log('   emit UserRegistered(msg.sender, referrer);');
      }
    } else {
      console.log("\n❌ No logs found at all! The contract may not be emitting any events.");
      console.log("\n🔧 This explains why reactivity isn't working - no events to react to!");
    }
  } catch (error) {
    console.error("Error fetching logs:", error);
  }
}

main().catch(console.error);