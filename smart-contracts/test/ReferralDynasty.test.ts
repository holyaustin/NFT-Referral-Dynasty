import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

// Connect to network (Hardhat v3 pattern)
const { ethers: hreEthers, networkHelpers } = await hre.network.connect();

describe("ReferralDynasty", function () {
  async function deployFixture() {
    const [owner, referrer, newUser, other] = await hreEthers.getSigners();
    
    // Deploy UserRegistry
    const Registry = await hreEthers.getContractFactory("UserRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    
    // Deploy ReferralBadge
    const Badge = await hreEthers.getContractFactory("ReferralBadge");
    const badge = await Badge.deploy();
    await badge.waitForDeployment();
    
    // Deploy TestableDynasty (with badge address)
    const Dynasty = await hreEthers.getContractFactory("TestableDynasty");
    const dynasty = await Dynasty.deploy(await badge.getAddress());
    await dynasty.waitForDeployment();
    
    // Transfer badge ownership to dynasty
    await badge.transferOwnership(await dynasty.getAddress());
    
    // Set registry as trusted using BOTH functions for complete testing
    await dynasty.setTrustedRegistry(await registry.getAddress(), true);
    await dynasty.setTrustedEmitter(await registry.getAddress(), true);
    
    // Fund dynasty with some ETH for rewards
    await owner.sendTransaction({
      to: await dynasty.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    
    return { registry, badge, dynasty, owner, referrer, newUser, other };
  }

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.owner()).to.equal(await owner.getAddress());
    });

    it("should have badge reference", async function () {
      const { dynasty, badge } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.badge()).to.equal(await badge.getAddress());
    });

    it("should have registry as trusted in both mappings", async function () {
      const { dynasty, registry } = await networkHelpers.loadFixture(deployFixture);
      expect(await dynasty.trustedRegistries(await registry.getAddress())).to.be.true;
      expect(await dynasty.trustedEmitters(await registry.getAddress())).to.be.true;
    });
  });

  describe("User Registration Flow", function () {
    it("should mint badge when user registers", async function () {
      const { registry, badge, newUser, referrer } = await networkHelpers.loadFixture(deployFixture);
      
      // First, give referrer a badge by having them register
      await registry.connect(referrer).register(other.address);
      
      // Now new user registers with referrer
      const tx = await registry.connect(newUser).register(referrer.address);
      await tx.wait();
      
      // Check that new user got a badge
      expect(await badge.hasBadge(await newUser.getAddress())).to.be.true;
    });

    it("should increment referrer's referral count", async function () {
      const { registry, badge, newUser, referrer, other } = await networkHelpers.loadFixture(deployFixture);
      
      // Give referrer a badge
      await registry.connect(referrer).register(other.address);
      
      // Get initial count
      const initialBadge = await badge.getUserBadge(await referrer.getAddress());
      const initialCount = initialBadge.referralCount;
      
      // New user registers
      await registry.connect(newUser).register(referrer.address);
      
      // Check count increased
      const finalBadge = await badge.getUserBadge(await referrer.getAddress());
      expect(finalBadge.referralCount).to.equal(initialCount + 1n);
    });
  });

  describe("Reactive handling via expose_onEvent", function () {
    it("should process referral when event is triggered", async function () {
      const { dynasty, registry, badge, referrer, newUser, other } = await networkHelpers.loadFixture(deployFixture);
      
      // Give referrer a badge through registration
      await registry.connect(referrer).register(other.address);
      
      // Get initial balance for reward check
      const initialBalance = await hreEthers.provider.getBalance(await referrer.getAddress());
      
      // Simulate UserRegistered event via expose_onEvent
      const topic = await dynasty.USER_REGISTERED_TOPIC();
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [await newUser.getAddress(), await referrer.getAddress()]
      );
      
      await dynasty.connect(referrer).expose_onEvent(
        await registry.getAddress(),
        [topic],
        data
      );
      
      // Check that new user got a badge
      expect(await badge.hasBadge(await newUser.getAddress())).to.be.true;
      
      // Check that referrer's referral count increased
      const badgeData = await badge.getUserBadge(await referrer.getAddress());
      expect(badgeData.referralCount).to.equal(1n);
      
      // Check that referrer got a reward (0.0001 ETH)
      const finalBalance = await hreEthers.provider.getBalance(await referrer.getAddress());
      expect(finalBalance - initialBalance).to.be.closeTo(
        ethers.parseEther("0.0001"),
        ethers.parseEther("0.00001")
      );
    });

    it("should not process from untrusted emitter", async function () {
      const { dynasty, registry, referrer, newUser, other } = await networkHelpers.loadFixture(deployFixture);
      
      const topic = await dynasty.USER_REGISTERED_TOPIC();
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [await newUser.getAddress(), await referrer.getAddress()]
      );
      
      // Try to call from untrusted address (other is not a trusted emitter)
      await expect(
        dynasty.connect(referrer).expose_onEvent(
          await other.getAddress(),
          [topic],
          data
        )
      ).to.be.revertedWith("Untrusted emitter");
    });

    it("should handle referrer without badge gracefully", async function () {
      const { dynasty, registry, badge, referrer, newUser } = await networkHelpers.loadFixture(deployFixture);
      
      // referrer has NO badge (never registered)
      
      const topic = await dynasty.USER_REGISTERED_TOPIC();
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [await newUser.getAddress(), await referrer.getAddress()]
      );
      
      await dynasty.connect(referrer).expose_onEvent(
        await registry.getAddress(),
        [topic],
        data
      );
      
      // New user should still get a badge
      expect(await badge.hasBadge(await newUser.getAddress())).to.be.true;
      
      // Referrer should not have a badge
      expect(await badge.hasBadge(await referrer.getAddress())).to.be.false;
    });
  });

  describe("Owner functions", function () {
    it("should allow owner to set trusted registry", async function () {
      const { dynasty, owner, other } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(dynasty.connect(owner).setTrustedRegistry(await other.getAddress(), true))
        .to.emit(dynasty, "RegistryTrustSet")
        .withArgs(await other.getAddress(), true);
      
      expect(await dynasty.trustedRegistries(await other.getAddress())).to.be.true;
    });

    it("should allow owner to set trusted emitter", async function () {
      const { dynasty, owner, other } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(dynasty.connect(owner).setTrustedEmitter(await other.getAddress(), true))
        .to.emit(dynasty, "EmitterTrustSet")
        .withArgs(await other.getAddress(), true);
      
      expect(await dynasty.trustedEmitters(await other.getAddress())).to.be.true;
    });

    it("should allow owner to pause", async function () {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(dynasty.connect(owner).pause())
        .to.emit(dynasty, "Paused")
        .withArgs(await owner.getAddress());
      
      expect(await dynasty.paused()).to.be.true;
      
      await expect(dynasty.connect(owner).unpause())
        .to.emit(dynasty, "Unpaused")
        .withArgs(await owner.getAddress());
      
      expect(await dynasty.paused()).to.be.false;
    });

    it("should allow owner to fund reward pool", async function () {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      const fundAmount = ethers.parseEther("0.5");
      
      const balanceBefore = await hreEthers.provider.getBalance(await dynasty.getAddress());
      
      await expect(dynasty.connect(owner).fundRewardPool({ value: fundAmount }))
        .to.emit(dynasty, "RewardPoolFunded");
      
      const balanceAfter = await hreEthers.provider.getBalance(await dynasty.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(fundAmount);
    });

    it("should allow owner to withdraw", async function () {
      const { dynasty, owner } = await networkHelpers.loadFixture(deployFixture);
      
      const contractBalance = await hreEthers.provider.getBalance(await dynasty.getAddress());
      const withdrawAmount = contractBalance / 2n; // Withdraw half
      
      const ownerBalanceBefore = await hreEthers.provider.getBalance(await owner.getAddress());
      
      const tx = await dynasty.connect(owner).withdraw(withdrawAmount);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await hreEthers.provider.getBalance(await owner.getAddress());
      
      // Owner balance should increase by withdrawAmount minus gas
      expect(ownerBalanceAfter - ownerBalanceBefore + gasCost).to.equal(withdrawAmount);
    });

    it("should revert when non-owner tries to set trusted registry", async function () {
      const { dynasty, referrer, other } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(
        dynasty.connect(referrer).setTrustedRegistry(await other.getAddress(), true)
      ).to.be.reverted;
    });

    it("should revert when non-owner tries to pause", async function () {
      const { dynasty, referrer } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(
        dynasty.connect(referrer).pause()
      ).to.be.reverted;
    });
  });

  describe("Fuzz testing", function () {
    it("should handle multiple referrals correctly", async function () {
      const { dynasty, registry, badge, referrer, other } = await networkHelpers.loadFixture(deployFixture);
      
      // Give referrer a badge
      await registry.connect(referrer).register(other.address);
      
      const topic = await dynasty.USER_REGISTERED_TOPIC();
      const referralCount = 5; // Test with 5 referrals
      
      for(let i = 0; i < referralCount; i++) {
        // Create a new unique user address
        const newUserAddr = ethers.Wallet.createRandom().address;
        
        const data = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address"],
          [newUserAddr, await referrer.getAddress()]
        );
        
        await dynasty.connect(referrer).expose_onEvent(
          await registry.getAddress(),
          [topic],
          data
        );
        
        // Verify each new user got a badge
        expect(await badge.hasBadge(newUserAddr)).to.be.true;
      }
      
      // Check final count
      const finalBadge = await badge.getUserBadge(await referrer.getAddress());
      expect(finalBadge.referralCount).to.equal(referralCount);
    });
  });
});