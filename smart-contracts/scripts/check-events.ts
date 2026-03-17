import { createPublicClient, http, Log, GetLogsParameters, Address, BlockTag } from 'viem';
import { somniaTestnet } from 'viem/chains';
import * as fs from 'fs';

const BATCH_SIZE = 1000n; // Safe batch size for RPC

// Define event types
interface UserRegisteredEvent {
  args?: {
    newUser: `0x${string}`;
    referrer: `0x${string}`;
  };
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockHash: `0x${string}`;
  address: `0x${string}`;
  data: `0x${string}`;
  topics: [`0x${string}`, `0x${string}`, `0x${string}`];
  logIndex: number;
  transactionIndex: number;
  removed?: boolean;
}

interface DynastyEvent {
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  blockHash: `0x${string}`;
  address: `0x${string}`;
  data: `0x${string}`;
  topics: `0x${string}`[];
  logIndex: number;
  transactionIndex: number;
  args?: any;
  removed?: boolean;
}

// Define event ABI for type safety
const userRegisteredEvent = {
  type: 'event' as const,
  name: 'UserRegistered',
  inputs: [
    { type: 'address', name: 'newUser', indexed: true },
    { type: 'address', name: 'referrer', indexed: true }
  ]
} as const;

// Type guard for error handling
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

async function getLogsInBatches(
  publicClient: ReturnType<typeof createPublicClient>,
  address: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
  useEventFilter: boolean = false
): Promise<Log[]> {
  const allLogs: Log[] = [];
  let currentFrom = fromBlock;

  console.log(`Fetching logs from block ${fromBlock} to ${toBlock} in batches of ${BATCH_SIZE}...`);

  while (currentFrom <= toBlock) {
    const currentTo = currentFrom + BATCH_SIZE - 1n > toBlock ? toBlock : currentFrom + BATCH_SIZE - 1n;
    
    try {
      console.log(`  Fetching blocks ${currentFrom} to ${currentTo}...`);
      
      // Prepare parameters
      const params: GetLogsParameters = {
        address,
        fromBlock: currentFrom,
        toBlock: currentTo,
      };
      
      const logs = await publicClient.getLogs(params);
      
      // Filter logs if needed (client-side filtering)
      if (useEventFilter && logs.length > 0) {
        // Filter for UserRegistered events by checking topics
        const filteredLogs = logs.filter((log: Log) => {
          // Check if this is a UserRegistered event by looking at the first topic
          // The first topic is the event signature hash
          return log.topics && log.topics.length >= 2;
        });
        allLogs.push(...filteredLogs);
        console.log(`    Found ${filteredLogs.length} UserRegistered logs in this batch (filtered from ${logs.length})`);
      } else {
        allLogs.push(...logs);
        console.log(`    Found ${logs.length} logs in this batch`);
      }
      
      currentFrom = currentTo + 1n;
    } catch (error) {
      console.error(`Error fetching batch ${currentFrom}-${currentTo}:`, getErrorMessage(error));
      
      // Try with smaller batch if we hit rate limits
      if (BATCH_SIZE > 100n) {
        console.log('Retrying with smaller batch size...');
        // Recursively try with half the batch size
        const halfBatch = BATCH_SIZE / 2n;
        const midPoint = currentFrom + halfBatch;
        
        const firstHalf = await getLogsInBatches(publicClient, address, currentFrom, midPoint, useEventFilter);
        const secondHalf = await getLogsInBatches(publicClient, address, midPoint + 1n, currentTo, useEventFilter);
        
        allLogs.push(...firstHalf, ...secondHalf);
        currentFrom = currentTo + 1n;
      } else {
        // If we can't reduce batch size further, throw the error
        throw error;
      }
    }
  }
  
  return allLogs;
}

// Helper function to safely convert log to UserRegisteredEvent
function toUserRegisteredEvent(log: Log): UserRegisteredEvent | null {
  try {
    // Check if log has required properties
    if (!log.transactionHash || !log.blockNumber || !log.blockHash || !log.address) {
      return null;
    }

    // Check if this looks like a UserRegistered event (has at least 2 topics)
    if (!log.topics || log.topics.length < 2) {
      return null;
    }

    // Parse args from topics and data if available
    const args = {
      newUser: log.topics[1] as `0x${string}`,
      referrer: log.topics[2] as `0x${string}` || '0x0000000000000000000000000000000000000000',
    };

    return {
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      address: log.address,
      data: log.data || '0x',
      topics: log.topics as [`0x${string}`, `0x${string}`, `0x${string}`],
      logIndex: log.logIndex || 0,
      transactionIndex: log.transactionIndex || 0,
      removed: log.removed,
      args,
    };
  } catch (error) {
    console.error('Error converting log to UserRegisteredEvent:', getErrorMessage(error));
    return null;
  }
}

// Helper function to safely convert log to DynastyEvent
function toDynastyEvent(log: Log): DynastyEvent | null {
  try {
    if (!log.transactionHash || !log.blockNumber || !log.blockHash || !log.address) {
      return null;
    }

    return {
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      address: log.address,
      data: log.data || '0x',
      topics: log.topics || [],
      logIndex: log.logIndex || 0,
      transactionIndex: log.transactionIndex || 0,
      removed: log.removed,
      args: log.topics ? { topics: log.topics } : undefined,
    };
  } catch (error) {
    console.error('Error converting log to DynastyEvent:', getErrorMessage(error));
    return null;
  }
}

async function main(): Promise<void> {
  console.log("🔍 Checking Contract Events...");
  console.log("==============================");

  try {
    // Check if deployment file exists
    if (!fs.existsSync('./deployment-referral-system.json')) {
      throw new Error('deployment-referral-system.json not found. Please run deployment first.');
    }

    const deployment = JSON.parse(
      fs.readFileSync('./deployment-referral-system.json', 'utf-8')
    );

    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    });

    const registryAddress = deployment.contracts.UserRegistry as `0x${string}`;
    const dynastyAddress = deployment.contracts.ReferralDynasty as `0x${string}`;

    console.log('\n📋 Contract Addresses:');
    console.log(`  UserRegistry: ${registryAddress}`);
    console.log(`  ReferralDynasty: ${dynastyAddress}`);

    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`\n📋 Current block: ${currentBlock}`);

    // Check last 5000 blocks (or adjust as needed)
    const fromBlock = currentBlock - 5000n > 0n ? currentBlock - 5000n : 0n;
    console.log(`📋 Checking from block ${fromBlock} to ${currentBlock}`);

    // Check UserRegistry events
    console.log(`\n📋 Checking UserRegistry events...`);
    try {
      const registryLogs = await getLogsInBatches(
        publicClient,
        registryAddress,
        fromBlock,
        currentBlock,
        true // Enable filtering for UserRegistered events
      );

      console.log(`\n✅ Found ${registryLogs.length} UserRegistered events total`);
      
      // Show recent events
      if (registryLogs.length > 0) {
        console.log("\n📋 Recent UserRegistered events:");
        registryLogs.slice(-5).forEach((log: Log, index: number) => {
          const userRegisteredLog = toUserRegisteredEvent(log);
          if (userRegisteredLog) {
            console.log(`  ${index + 1}. Tx: ${userRegisteredLog.transactionHash}`);
            if (userRegisteredLog.args) {
              console.log(`     New user: ${userRegisteredLog.args.newUser}`);
              console.log(`     Referrer: ${userRegisteredLog.args.referrer}`);
            }
            console.log(`     Block: ${userRegisteredLog.blockNumber}`);
          } else {
            console.log(`  ${index + 1}. Tx: ${log.transactionHash} (raw log)`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching UserRegistry events:', getErrorMessage(error));
    }

    // Check ReferralDynasty events
    console.log(`\n📋 Checking ReferralDynasty events...`);
    try {
      const dynastyLogs = await getLogsInBatches(
        publicClient,
        dynastyAddress,
        fromBlock,
        currentBlock,
        false // No filtering - get all events
      );

      console.log(`\n✅ Found ${dynastyLogs.length} events in ReferralDynasty`);

      if (dynastyLogs.length === 0) {
        console.log("\n❌ No events in ReferralDynasty - Reactivity is NOT working!");
        console.log("\n🔍 Possible issues:");
        console.log("1. Subscription not created or inactive");
        console.log("2. Emitter not trusted");
        console.log("3. Insufficient SOM balance (need 32+ SOM)");
        console.log("4. Gas parameters too low");
        
        // Check if emitter is trusted
        try {
          const isTrusted = await publicClient.readContract({
            address: dynastyAddress,
            abi: [{
              inputs: [{ name: "emitter", type: "address" }],
              name: "trustedEmitters",
              outputs: [{ type: "bool" }],
              stateMutability: "view",
              type: "function"
            }],
            functionName: "trustedEmitters",
            args: [registryAddress]
          });
          
          console.log(`\n📋 Emitter trusted status: ${isTrusted}`);
          if (!isTrusted) {
            console.log("\n❌ Emitter is NOT trusted! Run this in Hardhat console:");
            console.log(`const dynasty = await ethers.getContractAt("ReferralDynasty", "${dynastyAddress}")`);
            console.log(`await dynasty.setTrustedEmitter("${registryAddress}", true)`);
          }
        } catch (error) {
          console.log('Could not check trusted status:', getErrorMessage(error));
        }
      } else {
        console.log("\n✅ Reactivity is working! Events are being processed.");
        
        // Show recent events
        console.log("\n📋 Recent ReferralDynasty events:");
        dynastyLogs.slice(-5).forEach((log: Log, index: number) => {
          const dynastyEvent = toDynastyEvent(log);
          if (dynastyEvent) {
            console.log(`  ${index + 1}. Tx: ${dynastyEvent.transactionHash}`);
            console.log(`     Block: ${dynastyEvent.blockNumber}`);
            console.log(`     Topics: ${dynastyEvent.topics.length}`);
          } else {
            console.log(`  ${index + 1}. Tx: ${log.transactionHash} (raw log)`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching ReferralDynasty events:', getErrorMessage(error));
    }

    console.log('\n✅ Event check completed!');
    
  } catch (error) {
    console.error('❌ Fatal error in main:', getErrorMessage(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', getErrorMessage(error));
  process.exit(1);
});