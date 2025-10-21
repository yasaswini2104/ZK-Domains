import { expect } from "chai";
import { ethers } from "hardhat";
import { DomainNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("DomainNFT", function () {
  // Test fixture for deploying contract
  async function deployDomainNFTFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const DomainNFTFactory = await ethers.getContractFactory("DomainNFT");
    const domainNFT = await DomainNFTFactory.deploy();

    return { domainNFT, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      expect(await domainNFT.name()).to.equal("ZK-Domain");
      expect(await domainNFT.symbol()).to.equal("ZKDOMAIN");
    });

    it("Should set the correct owner", async function () {
      const { domainNFT, owner } = await loadFixture(deployDomainNFTFixture);

      expect(await domainNFT.owner()).to.equal(owner.address);
    });

    it("Should start with token ID counter at 1", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      expect(await domainNFT.getCurrentTokenId()).to.equal(1);
    });

    it("Should start with zero total supply", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      expect(await domainNFT.totalSupply()).to.equal(0);
    });
  });

  describe("Domain Minting", function () {
    it("Should mint a new domain successfully", async function () {
      const { domainNFT, owner, user1 } = await loadFixture(
        deployDomainNFTFixture
      );

      const domainName = "alice.zk";

      await expect(domainNFT.mintDomain(user1.address, domainName))
        .to.emit(domainNFT, "DomainMinted")
        .withArgs(user1.address, 1, domainName);

      expect(await domainNFT.ownerOf(1)).to.equal(user1.address);
      expect(await domainNFT.totalSupply()).to.equal(1);
    });

    it("Should increment token ID after each mint", async function () {
      const { domainNFT, user1, user2 } = await loadFixture(
        deployDomainNFTFixture
      );

      await domainNFT.mintDomain(user1.address, "domain1.zk");
      expect(await domainNFT.getCurrentTokenId()).to.equal(2);

      await domainNFT.mintDomain(user2.address, "domain2.zk");
      expect(await domainNFT.getCurrentTokenId()).to.equal(3);
    });

    it("Should create correct bidirectional mapping", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const domainName = "test.zk";
      await domainNFT.mintDomain(user1.address, domainName);

      expect(await domainNFT.getDomainTokenId(domainName)).to.equal(1);
      expect(await domainNFT.getTokenDomain(1)).to.equal(domainName);
    });

    it("Should mark domain as existing after minting", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const domainName = "exists.zk";

      expect(await domainNFT.domainExists(domainName)).to.be.false;

      await domainNFT.mintDomain(user1.address, domainName);

      expect(await domainNFT.domainExists(domainName)).to.be.true;
    });

    it("Should revert if non-owner tries to mint", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      await expect(
        domainNFT.connect(user1).mintDomain(user1.address, "test.zk")
      ).to.be.revertedWithCustomError(domainNFT, "OwnableUnauthorizedAccount");
    });

    it("Should revert if domain name is empty", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      await expect(
        domainNFT.mintDomain(user1.address, "")
      ).to.be.revertedWith("Domain name cannot be empty");
    });

    it("Should revert if domain already exists", async function () {
      const { domainNFT, user1, user2 } = await loadFixture(
        deployDomainNFTFixture
      );

      const domainName = "duplicate.zk";

      await domainNFT.mintDomain(user1.address, domainName);

      await expect(
        domainNFT.mintDomain(user2.address, domainName)
      ).to.be.revertedWith("Domain already exists");
    });

    it("Should revert if minting to zero address", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      await expect(
        domainNFT.mintDomain(ethers.ZeroAddress, "test.zk")
      ).to.be.revertedWith("Cannot mint to zero address");
    });
  });

  describe("Domain Queries", function () {
    it("Should return correct domain for token ID", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const domainName = "query.zk";
      await domainNFT.mintDomain(user1.address, domainName);

      expect(await domainNFT.getTokenDomain(1)).to.equal(domainName);
    });

    it("Should return correct token ID for domain", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const domainName = "lookup.zk";
      await domainNFT.mintDomain(user1.address, domainName);

      expect(await domainNFT.getDomainTokenId(domainName)).to.equal(1);
    });

    it("Should revert when querying non-existent domain", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      await expect(
        domainNFT.getDomainTokenId("nonexistent.zk")
      ).to.be.revertedWith("Domain does not exist");
    });

    it("Should revert when querying non-existent token", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      await expect(domainNFT.getTokenDomain(999)).to.be.revertedWith(
        "Token does not exist"
      );
    });

    it("Should return all domains owned by an address", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      await domainNFT.mintDomain(user1.address, "domain1.zk");
      await domainNFT.mintDomain(user1.address, "domain2.zk");
      await domainNFT.mintDomain(user1.address, "domain3.zk");

      const domains = await domainNFT.getDomainsOfOwner(user1.address);

      expect(domains.length).to.equal(3);
      expect(domains).to.include("domain1.zk");
      expect(domains).to.include("domain2.zk");
      expect(domains).to.include("domain3.zk");
    });

    it("Should return empty array for address with no domains", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const domains = await domainNFT.getDomainsOfOwner(user1.address);

      expect(domains.length).to.equal(0);
    });
  });

  describe("NFT Transfers", function () {
    it("Should allow owner to transfer domain NFT", async function () {
      const { domainNFT, user1, user2 } = await loadFixture(
        deployDomainNFTFixture
      );

      await domainNFT.mintDomain(user1.address, "transfer.zk");

      await domainNFT
        .connect(user1)
        .transferFrom(user1.address, user2.address, 1);

      expect(await domainNFT.ownerOf(1)).to.equal(user2.address);
    });

    it("Should update domains list after transfer", async function () {
      const { domainNFT, user1, user2 } = await loadFixture(
        deployDomainNFTFixture
      );

      await domainNFT.mintDomain(user1.address, "transfer.zk");

      await domainNFT
        .connect(user1)
        .transferFrom(user1.address, user2.address, 1);

      const user1Domains = await domainNFT.getDomainsOfOwner(user1.address);
      const user2Domains = await domainNFT.getDomainsOfOwner(user2.address);

      expect(user1Domains.length).to.equal(0);
      expect(user2Domains.length).to.equal(1);
      expect(user2Domains[0]).to.equal("transfer.zk");
    });

    it("Should preserve domain name after transfer", async function () {
      const { domainNFT, user1, user2 } = await loadFixture(
        deployDomainNFTFixture
      );

      const domainName = "persistent.zk";
      await domainNFT.mintDomain(user1.address, domainName);

      await domainNFT
        .connect(user1)
        .transferFrom(user1.address, user2.address, 1);

      expect(await domainNFT.getTokenDomain(1)).to.equal(domainName);
      expect(await domainNFT.getDomainTokenId(domainName)).to.equal(1);
    });
  });

  describe("ERC721 Enumerable", function () {
    it("Should track total supply correctly", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      expect(await domainNFT.totalSupply()).to.equal(0);

      await domainNFT.mintDomain(user1.address, "domain1.zk");
      expect(await domainNFT.totalSupply()).to.equal(1);

      await domainNFT.mintDomain(user1.address, "domain2.zk");
      expect(await domainNFT.totalSupply()).to.equal(2);
    });

    it("Should allow enumeration of tokens by owner", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      await domainNFT.mintDomain(user1.address, "domain1.zk");
      await domainNFT.mintDomain(user1.address, "domain2.zk");

      expect(await domainNFT.balanceOf(user1.address)).to.equal(2);
      expect(await domainNFT.tokenOfOwnerByIndex(user1.address, 0)).to.equal(1);
      expect(await domainNFT.tokenOfOwnerByIndex(user1.address, 1)).to.equal(2);
    });

    it("Should allow enumeration of all tokens", async function () {
      const { domainNFT, user1, user2 } = await loadFixture(
        deployDomainNFTFixture
      );

      await domainNFT.mintDomain(user1.address, "domain1.zk");
      await domainNFT.mintDomain(user2.address, "domain2.zk");

      expect(await domainNFT.tokenByIndex(0)).to.equal(1);
      expect(await domainNFT.tokenByIndex(1)).to.equal(2);
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      // ERC721 interface ID
      expect(await domainNFT.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Enumerable interface", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      // ERC721Enumerable interface ID
      expect(await domainNFT.supportsInterface("0x780e9d63")).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      const { domainNFT } = await loadFixture(deployDomainNFTFixture);

      // ERC721Metadata interface ID
      expect(await domainNFT.supportsInterface("0x5b5e139f")).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle long domain names", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const longDomain = "a".repeat(100) + ".zk";
      await domainNFT.mintDomain(user1.address, longDomain);

      expect(await domainNFT.getTokenDomain(1)).to.equal(longDomain);
    });

    it("Should handle special characters in domain names", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      const specialDomain = "test-domain_123.zk";
      await domainNFT.mintDomain(user1.address, specialDomain);

      expect(await domainNFT.getTokenDomain(1)).to.equal(specialDomain);
    });

    it("Should handle multiple domains for same owner", async function () {
      const { domainNFT, user1 } = await loadFixture(deployDomainNFTFixture);

      for (let i = 1; i <= 10; i++) {
        await domainNFT.mintDomain(user1.address, `domain${i}.zk`);
      }

      expect(await domainNFT.balanceOf(user1.address)).to.equal(10);

      const domains = await domainNFT.getDomainsOfOwner(user1.address);
      expect(domains.length).to.equal(10);
    });
  });
});