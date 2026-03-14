import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

const { ethers: hreEthers, networkHelpers } = await hre.network.connect();

describe("ReferralBadge", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await hreEthers.getSigners();
    
    const Badge = await hreEthers.getContractFactory("ReferralBadge");
    const badge = await Badge.deploy();
    await badge.waitForDeployment();
    
    return { badge, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("has correct name and symbol", async function () {
      const { badge } = await networkHelpers.loadFixture(deployFixture);
      expect(await badge.name()).to.equal("Referral Dynasty");
      expect(await badge.symbol()).to.equal("RDYST");
    });

    it("sets deployer as owner", async function () {
      const { badge, owner } = await networkHelpers.loadFixture(deployFixture);
      expect(await badge.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("mint()", function () {
    it("should mint badge to user", async function () {
      const { badge, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(badge.connect(owner).mint(await user1.getAddress()))
        .to.emit(badge, "BadgeMinted")
        .withArgs(await user1.getAddress(), 1);
      
      expect(await badge.hasBadge(await user1.getAddress())).to.be.true;
      expect(await badge.userTokenId(await user1.getAddress())).to.equal(1);
      expect(await badge.ownerOf(1)).to.equal(await user1.getAddress());
    });

    it("should not allow non-owner to mint", async function () {
      const { badge, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(
        badge.connect(user1).mint(await user2.getAddress())
      ).to.be.revertedWith("Only dynasty can call");
    });

    it("should not allow double mint for same user", async function () {
      const { badge, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await badge.connect(owner).mint(await user1.getAddress());
      
      await expect(
        badge.connect(owner).mint(await user1.getAddress())
      ).to.be.revertedWith("Already has badge");
    });
  });

  describe("incrementReferral()", function () {
    it("should increment referral count", async function () {
      const { badge, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await badge.connect(owner).mint(await user1.getAddress());
      await badge.connect(owner).incrementReferral(await user1.getAddress());
      
      const badgeData = await badge.getUserBadge(await user1.getAddress());
      expect(badgeData.referralCount).to.equal(1);
    });

    it("should upgrade to Silver at 5 referrals", async function () {
      const { badge, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await badge.connect(owner).mint(await user1.getAddress());
      
      for (let i = 0; i < 5; i++) {
        await badge.connect(owner).incrementReferral(await user1.getAddress());
      }
      
      const badgeData = await badge.getUserBadge(await user1.getAddress());
      expect(badgeData.tier).to.equal(1); // Silver
    });

    it("should emit BadgeUpgraded on tier change", async function () {
      const { badge, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await badge.connect(owner).mint(await user1.getAddress());
      
      // 4 increments (no upgrade yet)
      for (let i = 0; i < 4; i++) {
        await badge.connect(owner).incrementReferral(await user1.getAddress());
      }
      
      // 5th should trigger upgrade
      await expect(
        badge.connect(owner).incrementReferral(await user1.getAddress())
      )
        .to.emit(badge, "BadgeUpgraded")
        .withArgs(1, 1, 5);
    });
  });

  describe("tokenURI()", function () {
    it("should return correct URI", async function () {
      const { badge, owner, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await badge.connect(owner).mint(await user1.getAddress());
      
      expect(await badge.tokenURI(1)).to.equal("ipfs://QmBase/1.json");
    });
  });
});