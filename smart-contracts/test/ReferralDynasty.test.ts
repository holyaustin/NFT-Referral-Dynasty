import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ReferralDynasty } from "../typechain-types";

describe("ReferralDynasty", function () {
  let referralDynasty: ReferralDynasty;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const ReferralDynasty = await ethers.getContractFactory("ReferralDynasty");
    referralDynasty = await ReferralDynasty.deploy();
    await referralDynasty.waitForDeployment();
  });

  describe("Badge Minting", function () {
    it("Should allow users to mint badges", async function () {
      await referralDynasty.connect(user1).mintBadge({ value: ethers.parseEther("0.01") });
      
      expect(await referralDynasty.hasMintedBadge(user1.address)).to.be.true;
      expect(await referralDynasty.balanceOf(user1.address)).to.equal(1);
    });

    it("Should not allow double minting", async function () {
      await referralDynasty.connect(user1).mintBadge({ value: ethers.parseEther("0.01") });
      
      await expect(
        referralDynasty.connect(user1).mintBadge({ value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Already minted");
    });
  });

  describe("Referral System", function () {
    beforeEach(async function () {
      // Mint badges for users
      await referralDynasty.connect(user1).mintBadge({ value: ethers.parseEther("0.01") });
      await referralDynasty.connect(user2).mintBadge({ value: ethers.parseEther("0.01") });
    });

    it("Should handle new referrals", async function () {
      // Simulate reactive event
      const USER_REGISTERED_TOPIC = await referralDynasty.USER_REGISTERED_TOPIC();
      
      // Encode event data
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [user3.address, user1.address]
      );
      
      // Trigger handler
      await referralDynasty._onEvent(
        ethers.ZeroAddress,
        [USER_REGISTERED_TOPIC, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash],
        data
      );
      
      expect(await referralDynasty.getReferralCount(user1.address)).to.equal(1);
    });

    it("Should cascade rewards correctly", async function () {
      // Set up referral chain: user1 -> user2 -> user3
      const USER_REGISTERED_TOPIC = await referralDynasty.USER_REGISTERED_TOPIC();
      
      // Register user2 referred by user1
      await referralDynasty._onEvent(
        ethers.ZeroAddress,
        [USER_REGISTERED_TOPIC, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash],
        ethers.AbiCoder.defaultAbiCoder().encode(["address", "address"], [user2.address, user1.address])
      );
      
      // Register user3 referred by user2
      await referralDynasty._onEvent(
        ethers.ZeroAddress,
        [USER_REGISTERED_TOPIC, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash],
        ethers.AbiCoder.defaultAbiCoder().encode(["address", "address"], [user3.address, user2.address])
      );
      
      // Simulate trade by user3
      const TRADE_EXECUTED_TOPIC = await referralDynasty.TRADE_EXECUTED_TOPIC();
      const tradeAmount = ethers.parseEther("1.0");
      
      const initialBalance1 = await ethers.provider.getBalance(user1.address);
      
      await referralDynasty._onEvent(
        ethers.ZeroAddress,
        [TRADE_EXECUTED_TOPIC, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash],
        ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [user3.address, tradeAmount])
      );
      
      // Check rewards
      const finalBalance1 = await ethers.provider.getBalance(user1.address);
      expect(finalBalance1 - initialBalance1).to.be.closeTo(
        ethers.parseEther("0.1"), // 10% of 1 ETH
        ethers.parseEther("0.001")
      );
    });
  });
});