/**
 * ReferralBadge.test.ts
 * Hardhat v3 · Mocha · Chai · ethers v6
 */

import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "ethers";

// Connect to a fresh network simulation
const { ethers: hreEthers, networkHelpers } = await hre.network.connect();

// ─── Fixture ──────────────────────────────────────────────────────────────────

async function deployBadgeFixture() {
  const [owner, alice, bob, carol, attacker] = await hreEthers.getSigners();

  const BadgeFactory = await hreEthers.getContractFactory("ReferralBadge");
  const badge = await BadgeFactory.deploy();
  await badge.waitForDeployment();

  return { badge, owner, alice, bob, carol, attacker };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ReferralBadge", () => {

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe("Deployment", () => {
    it("has correct name", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.name()).to.equal("Referral Dynasty");
    });

    it("has correct symbol", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.symbol()).to.equal("RDYST");
    });

    it("sets deployer as owner", async () => {
      const { badge, owner } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.owner()).to.equal(await owner.getAddress());
    });

    it("starts with zero badges", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.totalBadges()).to.equal(0n);
    });
  });

  // ── mint() ──────────────────────────────────────────────────────────────────

  describe("mint()", () => {
    it("mints token ID 1 for first user", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      expect(await badge.totalBadges()).to.equal(1n);
    });

    it("sets hasBadge flag", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      expect(await badge.hasBadge(await alice.getAddress())).to.be.true;
    });

    it("sets userTokenId mapping", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      expect(await badge.userTokenId(await alice.getAddress())).to.equal(1n);
    });

    it("assigns ERC721 ownership", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      expect(await badge.ownerOf(1n)).to.equal(await alice.getAddress());
    });

    it("increments totalBadges", async () => {
      const { badge, owner, alice, bob } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await badge.connect(owner).mint(await bob.getAddress());
      expect(await badge.totalBadges()).to.equal(2n);
    });

    it("initialises badge at tier 0", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      const b = await badge.getBadge(1n);
      expect(b.tier).to.equal(0);
      expect(b.referralCount).to.equal(0);
      expect(b.lastUpdate).to.be.gt(0n);
    });

    it("emits BadgeMinted event", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await expect(badge.connect(owner).mint(await alice.getAddress()))
        .to.emit(badge, "BadgeMinted")
        .withArgs(await alice.getAddress(), 1n);
    });

    it("reverts on double mint for same user", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await expect(
        badge.connect(owner).mint(await alice.getAddress())
      ).to.be.revertedWith("Already have badge");
    });

    it("reverts if caller is not owner", async () => {
      const { badge, attacker, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await expect(
        badge.connect(attacker).mint(await alice.getAddress())
      ).to.be.reverted;
    });
  });

  // ── incrementReferral() ─────────────────────────────────────────────────────

  describe("incrementReferral()", () => {
    it("increments referralCount", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await badge.connect(owner).incrementReferral(await alice.getAddress());
      const badgeData = await badge.getBadge(1n);
      expect(badgeData.referralCount).to.equal(1);
    });

    it("reverts if user has no badge", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await expect(
        badge.connect(owner).incrementReferral(await alice.getAddress())
      ).to.be.revertedWith("No badge");
    });

    it("reverts if caller is not owner", async () => {
      const { badge, owner, attacker, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await expect(
        badge.connect(attacker).incrementReferral(await alice.getAddress())
      ).to.be.reverted;
    });
  });

  // ── Tier upgrades ────────────────────────────────────────────────────────────

  describe("Tier upgrades", () => {
    async function incrementN(badge: any, owner: any, user: any, n: number) {
      for (let i = 0; i < n; i++) {
        await badge.connect(owner).incrementReferral(await user.getAddress());
      }
    }

    it("upgrades to Silver (tier 1) at 5 referrals", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await incrementN(badge, owner, alice, 5);
      const badgeData = await badge.getBadge(1n);
      expect(badgeData.tier).to.equal(1);
    });

    it("upgrades to Gold (tier 2) at 20 referrals", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await incrementN(badge, owner, alice, 20);
      const badgeData = await badge.getBadge(1n);
      expect(badgeData.tier).to.equal(2);
    });

    it("upgrades to Platinum (tier 3) at 50 referrals", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await incrementN(badge, owner, alice, 50);
      const badgeData = await badge.getBadge(1n);
      expect(badgeData.tier).to.equal(3);
    });

    it("emits BadgeUpgraded when upgrading to Silver", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await incrementN(badge, owner, alice, 4);
      await expect(
        badge.connect(owner).incrementReferral(await alice.getAddress())
      )
        .to.emit(badge, "BadgeUpgraded")
        .withArgs(1n, 1, 5);
    });

    it("tier never exceeds Platinum (3)", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      await incrementN(badge, owner, alice, 60);
      const badgeData = await badge.getBadge(1n);
      expect(badgeData.tier).to.equal(3);
    });
  });

  // ── tokenURI ─────────────────────────────────────────────────────────────────

  describe("tokenURI()", () => {
    it("returns correct URI for token 1", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).mint(await alice.getAddress());
      expect(await badge.tokenURI(1n)).to.equal("ipfs://QmBase/1.json");
    });

    it("reverts for nonexistent token", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      await expect(badge.tokenURI(999n)).to.be.revertedWith("Nonexistent");
    });
  });

  // ── getBadge ─────────────────────────────────────────────────────────────────

  describe("getBadge()", () => {
    it("reverts for nonexistent token", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      await expect(badge.getBadge(999n)).to.be.revertedWith("Badge not found");
    });
  });

  // ── ERC721 interface ──────────────────────────────────────────────────────────

  describe("supportsInterface()", () => {
    it("supports ERC165", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("supports ERC721", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("supports ERC721Metadata", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("rejects unknown interface", async () => {
      const { badge } = await networkHelpers.loadFixture(deployBadgeFixture);
      expect(await badge.supportsInterface("0xdeadbeef")).to.be.false;
    });
  });

  // ── Ownership transfer ────────────────────────────────────────────────────────

  describe("Ownership", () => {
    it("transfers ownership correctly", async () => {
      const { badge, owner, alice } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).transferOwnership(await alice.getAddress());
      expect(await badge.owner()).to.equal(await alice.getAddress());
    });

    it("old owner cannot mint after transfer", async () => {
      const { badge, owner, alice, bob } = await networkHelpers.loadFixture(deployBadgeFixture);
      await badge.connect(owner).transferOwnership(await alice.getAddress());
      await expect(
        badge.connect(owner).mint(await bob.getAddress())
      ).to.be.reverted;
    });
  });
});