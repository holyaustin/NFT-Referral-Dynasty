import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

const { ethers: hreEthers, networkHelpers } = await hre.network.connect();

describe("UserRegistry", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await hreEthers.getSigners();
    
    const Registry = await hreEthers.getContractFactory("UserRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    
    return { registry, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      expect(await registry.getAddress()).to.be.properAddress;
    });
  });

  describe("register()", function () {
    it("should register a new user with referrer", async function () {
      const { registry, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(registry.connect(user1).register(await user2.getAddress()))
        .to.emit(registry, "UserRegistered")
        .withArgs(await user1.getAddress(), await user2.getAddress());
      
      expect(await registry.registered(await user1.getAddress())).to.be.true;
      expect(await registry.referrers(await user1.getAddress())).to.equal(await user2.getAddress());
    });

    it("should not allow self-referral", async function () {
      const { registry, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(
        registry.connect(user1).register(await user1.getAddress())
      ).to.be.revertedWith("Cannot self-refer");
    });

    it("should not allow double registration", async function () {
      const { registry, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
      
      await registry.connect(user1).register(await user2.getAddress());
      
      await expect(
        registry.connect(user1).register(await user2.getAddress())
      ).to.be.revertedWith("Already registered");
    });
  });

  describe("registerDirect()", function () {
    it("should register a new user without referrer", async function () {
      const { registry, user1 } = await networkHelpers.loadFixture(deployFixture);
      
      await expect(registry.connect(user1).registerDirect())
        .to.emit(registry, "UserRegistered")
        .withArgs(await user1.getAddress(), ethers.ZeroAddress);
      
      expect(await registry.registered(await user1.getAddress())).to.be.true;
    });
  });

  describe("isRegistered()", function () {
    it("should return correct registration status", async function () {
      const { registry, user1, user2 } = await networkHelpers.loadFixture(deployFixture);
      
      expect(await registry.isRegistered(await user1.getAddress())).to.be.false;
      
      await registry.connect(user1).register(await user2.getAddress());
      
      expect(await registry.isRegistered(await user1.getAddress())).to.be.true;
    });
  });
});