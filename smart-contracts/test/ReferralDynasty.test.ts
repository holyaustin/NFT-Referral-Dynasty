/**
 * ReferralDynasty.test.ts
 * Hardhat v3 · Mocha · Chai · ethers v6
 * 
 * Following official Hardhat patterns exactly:
 * - hre.network.connect() to get ethers and networkHelpers
 * - loadFixture via networkHelpers.loadFixture()
 * - time via networkHelpers.time.increase()
 */

import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "ethers";

// Connect to a fresh network simulation for this test file
const { ethers: hreEthers, networkHelpers } = await hre.network.connect();

// ─── Constants ────────────────────────────────────────────────────────────────

const MINT_FEE = ethers.parseEther("0.01");
const POOL_SEED = ethers.parseEther("10");
const HOUR = 3600n; // Use BigInt literal
const DAY = 86400n; // Use BigInt literal

// ─── Fixture ──────────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, alice, bob, carol, dave, attacker] = await hreEthers.getSigners();

  // Deploy TestableDynasty (which inherits from ReferralDynasty)
  const TestableDynastyFactory = await hreEthers.getContractFactory("TestableDynasty");
  const dynasty = await TestableDynastyFactory.deploy();
  await dynasty.waitForDeployment();

  // Register owner as the trusted emitter for tests
  await dynasty.connect(owner).setTrustedEmitter(await owner.getAddress(), true);

  // Seed reward pool
  await dynasty.connect(owner).fundRewardPool({ value: POOL_SEED });

  return { dynasty, owner, alice, bob, carol, dave, attacker };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Encode and dispatch a simulated on-chain event through expose_onEvent.
 */
async function dispatchEvent(
  dynasty: any,
  emitter: any,
  topic: string,
  encodedData: string
) {
  const iface = new ethers.Interface([
    "function expose_onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data) external",
  ]);
  const calldata = iface.encodeFunctionData("expose_onEvent", [
    await emitter.getAddress(),
    [topic],
    encodedData,
  ]);
  const tx = await emitter.sendTransaction({
    to: await dynasty.getAddress(),
    data: calldata,
  });
  await tx.wait();
  return tx;
}

async function registerReferral(
  dynasty: any,
  emitter: any,
  referrer: any,
  newUser: any
) {
  const topic = await dynasty.USER_REGISTERED_TOPIC();
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address"],
    [await newUser.getAddress(), await referrer.getAddress()]
  );
  return dispatchEvent(dynasty, emitter, topic, data);
}

async function simulateTrade(
  dynasty: any,
  emitter: any,
  trader: any,
  amount: bigint
) {
  const topic = await dynasty.TRADE_EXECUTED_TOPIC();
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [await trader.getAddress(), amount]
  );
  return dispatchEvent(dynasty, emitter, topic, data);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ReferralDynasty", () => {

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe("Deployment", () => {
    it("sets owner correctly", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.owner()).to.equal(await owner.getAddress());
    });

    it("starts unpaused", async () => {
      const { dynasty } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.paused()).to.be.false;
    });

    it("starts with zero referrals", async () => {
      const { dynasty } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.totalReferrals()).to.equal(0n);
    });

    it("reward pool seeded correctly", async () => {
      const { dynasty } = await networkHelpers.loadFixture(deployFixture);
      expect((await dynasty.getRewardPool()).remaining).to.equal(POOL_SEED);
    });
  });

  // ── mintBadge ───────────────────────────────────────────────────────────────

  describe("mintBadge()", () => {
    it("mints badge and sets hasBadge", async () => {
      const { dynasty, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      expect(await dynasty.hasBadge(await alice.getAddress())).to.be.true;
    });

    it("adds MINT_FEE to reward pool", async () => {
      const { dynasty, alice } = await networkHelpers.loadFixture(deployFixture);
      const before = (await dynasty.getRewardPool()).remaining;
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      expect((await dynasty.getRewardPool()).remaining - before).to.equal(MINT_FEE);
    });

    it("refunds excess ETH", async () => {
      const { dynasty, alice } = await networkHelpers.loadFixture(deployFixture);
      const before = await hreEthers.provider.getBalance(await alice.getAddress());
      const tx = await dynasty.connect(alice).mintBadge({ value: ethers.parseEther("0.05") });
      const rc = await tx.wait();
      const gas = rc!.gasUsed * rc!.gasPrice;
      const after = await hreEthers.provider.getBalance(await alice.getAddress());
      // All operations are with bigint, no number mixing
      expect(before - after - gas).to.equal(MINT_FEE);
    });

    it("reverts if fee too low", async () => {
      const { dynasty, alice } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        dynasty.connect(alice).mintBadge({ value: ethers.parseEther("0.005") })
      ).to.be.revertedWith("Need 0.01 ETH");
    });

    it("reverts on double mint", async () => {
      const { dynasty, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await expect(
        dynasty.connect(alice).mintBadge({ value: MINT_FEE })
      ).to.be.revertedWith("Already have badge");
    });

    it("reverts when paused", async () => {
      const { dynasty, owner, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(owner).togglePause();
      await expect(
        dynasty.connect(alice).mintBadge({ value: MINT_FEE })
      ).to.be.revertedWith("Paused");
    });
  });

  // ── setTrustedEmitter ───────────────────────────────────────────────────────

  describe("setTrustedEmitter()", () => {
    it("enables a trusted emitter", async () => {
      const { dynasty, owner, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(owner).setTrustedEmitter(await alice.getAddress(), true);
      expect(await dynasty.trustedEmitters(await alice.getAddress())).to.be.true;
    });

    it("emits TrustedEmitterSet", async () => {
      const { dynasty, owner, alice } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        dynasty.connect(owner).setTrustedEmitter(await alice.getAddress(), true)
      )
        .to.emit(dynasty, "TrustedEmitterSet")
        .withArgs(await alice.getAddress(), true);
    });

    it("reverts for non-owner", async () => {
      const { dynasty, attacker } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        dynasty.connect(attacker).setTrustedEmitter(await attacker.getAddress(), true)
      ).to.be.reverted;
    });

    it("reverts for zero address", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        dynasty.connect(owner).setTrustedEmitter(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Zero address");
    });
  });

  // ── Referral registration ────────────────────────────────────────────────────

  describe("Referral registration", () => {
    it("sets referrer on new user", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);

      const referrerAddr = await dynasty.referrer(await bob.getAddress());
      expect(referrerAddr).to.equal(await alice.getAddress());
    });

    it("increments referralCount on referrer", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);
      expect(await dynasty.referralCount(await alice.getAddress())).to.equal(1n);
    });

    it("increments totalReferrals", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);
      expect(await dynasty.totalReferrals()).to.equal(1n);
    });

    it("emits ReferralMade", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      
      await expect(
        registerReferral(dynasty, owner, alice, bob)
      )
        .to.emit(dynasty, "ReferralMade")
        .withArgs(await alice.getAddress(), await bob.getAddress());
    });

    it("reverts if referrer has no badge", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        registerReferral(dynasty, owner, alice, bob)
      ).to.be.revertedWith("Referrer no badge");
    });

    it("reverts on self-referral", async () => {
      const { dynasty, owner, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await expect(
        registerReferral(dynasty, owner, alice, alice)
      ).to.be.revertedWith("Self refer");
    });

    it("reverts if already referred", async () => {
      const { dynasty, owner, alice, bob, carol } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await dynasty.connect(bob).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, carol);
      await expect(
        registerReferral(dynasty, owner, bob, carol)
      ).to.be.revertedWith("Already referred");
    });

    it("reverts from untrusted emitter", async () => {
      const { dynasty, alice, bob, attacker } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await expect(
        registerReferral(dynasty, attacker, alice, bob)
      ).to.be.revertedWith("Untrusted emitter");
    });
  });

  // ── Tier upgrades ────────────────────────────────────────────────────────────

  describe("Tier upgrades via referrals", () => {
    it("upgrades badge to Silver at 5 referrals", async () => {
      const { dynasty, owner, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      
      for (let i = 0; i < 5; i++) {
        const w = ethers.Wallet.createRandom().connect(hreEthers.provider);
        await owner.sendTransaction({ to: await w.getAddress(), value: MINT_FEE });
        await registerReferral(dynasty, owner, alice, w);
      }
      
      const tokenId = await dynasty.userTokenId(await alice.getAddress());
      const badge = await dynasty.getBadge(tokenId);
      expect(badge.tier).to.equal(1);
    });

    it("emits BadgeUpgraded on 5th referral", async () => {
      const { dynasty, owner, alice } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      const tokenId = await dynasty.userTokenId(await alice.getAddress());

      for (let i = 0; i < 4; i++) {
        const w = ethers.Wallet.createRandom().connect(hreEthers.provider);
        await owner.sendTransaction({ to: await w.getAddress(), value: MINT_FEE });
        await registerReferral(dynasty, owner, alice, w);
      }

      const finalUser = ethers.Wallet.createRandom().connect(hreEthers.provider);
      await expect(
        registerReferral(dynasty, owner, alice, finalUser)
      ).to.emit(dynasty, "BadgeUpgraded").withArgs(tokenId, 1, 5);
    });
  });

  // ── Reward cascade ───────────────────────────────────────────────────────────

  describe("Reward cascade", () => {
    it("pays 10% to direct referrer (tier 1)", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);

      const before = await hreEthers.provider.getBalance(await alice.getAddress());
      await simulateTrade(dynasty, owner, bob, ethers.parseEther("1"));
      const after = await hreEthers.provider.getBalance(await alice.getAddress());
      expect(after - before).to.equal(ethers.parseEther("0.1"));
    });

    it("pays 5% to tier-2 referrer", async () => {
      const { dynasty, owner, alice, bob, carol } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await dynasty.connect(bob).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);
      await registerReferral(dynasty, owner, bob, carol);

      await networkHelpers.time.increase(HOUR + 1n);
      const before = await hreEthers.provider.getBalance(await alice.getAddress());
      await simulateTrade(dynasty, owner, carol, ethers.parseEther("1"));
      const after = await hreEthers.provider.getBalance(await alice.getAddress());
      expect(after - before).to.equal(ethers.parseEther("0.05"));
    });

    it("emits RewardPaid for each level", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);

      await expect(
        simulateTrade(dynasty, owner, bob, ethers.parseEther("1"))
      )
        .to.emit(dynasty, "RewardPaid")
        .withArgs(await alice.getAddress(), ethers.parseEther("0.1"), 1);
    });

    it("skips non-badge holder in chain", async () => {
      const { dynasty, owner, alice, bob, carol } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob); // bob has NO badge
      await registerReferral(dynasty, owner, bob, carol);

      const bobBefore = await hreEthers.provider.getBalance(await bob.getAddress());
      await simulateTrade(dynasty, owner, carol, ethers.parseEther("1"));
      expect(await hreEthers.provider.getBalance(await bob.getAddress())).to.equal(bobBefore);
    });

    it("updates totalRewards field on user", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);
      await simulateTrade(dynasty, owner, bob, ethers.parseEther("1"));

      expect(await dynasty.totalRewards(await alice.getAddress())).to.equal(ethers.parseEther("0.1"));
    });
  });

  // ── Cooldown ─────────────────────────────────────────────────────────────────

  describe("Reward cooldown", () => {
    it("blocks second reward within 1 hour", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);
      await simulateTrade(dynasty, owner, bob, ethers.parseEther("0.1"));

      await expect(
        simulateTrade(dynasty, owner, bob, ethers.parseEther("0.1"))
      ).to.be.revertedWith("Cooldown active");
    });

    it("allows reward after 1 hour", async () => {
      const { dynasty, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(alice).mintBadge({ value: MINT_FEE });
      await registerReferral(dynasty, owner, alice, bob);
      await simulateTrade(dynasty, owner, bob, ethers.parseEther("0.1"));
      await networkHelpers.time.increase(HOUR + 1n);
      await expect(
        simulateTrade(dynasty, owner, bob, ethers.parseEther("0.1"))
      ).to.not.be.reverted;
    });
  });

  // ── Reward pool ────────────────────────────────────────────────────────────────

  describe("fundRewardPool()", () => {
    it("increases pool remaining", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      const before = (await dynasty.getRewardPool()).remaining;
      await dynasty.connect(owner).fundRewardPool({ value: ethers.parseEther("5") });
      expect((await dynasty.getRewardPool()).remaining - before).to.equal(ethers.parseEther("5"));
    });

    it("emits RewardPoolFunded", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        dynasty.connect(owner).fundRewardPool({ value: ethers.parseEther("1") })
      )
        .to.emit(dynasty, "RewardPoolFunded")
        .withArgs(ethers.parseEther("1"));
    });

    it("reverts for non-owner", async () => {
      const { dynasty, attacker } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        dynasty.connect(attacker).fundRewardPool({ value: ethers.parseEther("1") })
      ).to.be.reverted;
    });
  });

  // ── Pause ──────────────────────────────────────────────────────────────────────

  describe("togglePause()", () => {
    it("pauses the contract", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(owner).togglePause();
      expect(await dynasty.paused()).to.be.true;
    });

    it("unpauses the contract", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await dynasty.connect(owner).togglePause();
      await dynasty.connect(owner).togglePause();
      expect(await dynasty.paused()).to.be.false;
    });

    it("emits Paused", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await expect(dynasty.connect(owner).togglePause())
        .to.emit(dynasty, "Paused")
        .withArgs(await owner.getAddress());
    });

    it("reverts for non-owner", async () => {
      const { dynasty, attacker } = await networkHelpers.loadFixture(deployFixture);
      await expect(dynasty.connect(attacker).togglePause()).to.be.reverted;
    });
  });

  // ── Withdraw ──────────────────────────────────────────────────────────────────

  describe("withdraw()", () => {
    it("sends withdrawable ETH to owner", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await owner.sendTransaction({
        to: await dynasty.getAddress(),
        value: ethers.parseEther("1"),
      });
      const ownerBefore = await hreEthers.provider.getBalance(await owner.getAddress());
      const tx = await dynasty.connect(owner).withdraw();
      const rc = await tx.wait();
      const gas = rc!.gasUsed * rc!.gasPrice;
      const ownerAfter = await hreEthers.provider.getBalance(await owner.getAddress());
      // All bigint operations
      expect(ownerAfter - ownerBefore + gas).to.equal(ethers.parseEther("1"));
    });

    it("reverts when nothing to withdraw", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      await expect(dynasty.connect(owner).withdraw()).to.be.revertedWith("No funds");
    });

    it("reverts for non-owner", async () => {
      const { dynasty, attacker } = await networkHelpers.loadFixture(deployFixture);
      await expect(dynasty.connect(attacker).withdraw()).to.be.reverted;
    });
  });

  // ── View functions ────────────────────────────────────────────────────────────

  describe("View functions", () => {
    it("getReferralCount returns 0 by default", async () => {
      const { dynasty, alice } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.referralCount(await alice.getAddress())).to.equal(0n);
    });

    it("getRewardPool returns seeded amount", async () => {
      const { dynasty } = await networkHelpers.loadFixture(deployFixture);
      expect((await dynasty.getRewardPool()).remaining).to.equal(POOL_SEED);
    });
  });

  // ── Unknown topic ─────────────────────────────────────────────────────────────

  describe("Unknown topic handling", () => {
    it("silently ignores unknown topics without reverting", async () => {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      const unknownTopic = ethers.id("UnknownEvent(address)");
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [await owner.getAddress()]
      );
      await expect(
        dispatchEvent(dynasty, owner, unknownTopic, data)
      ).to.not.be.reverted;
    });
  });
});