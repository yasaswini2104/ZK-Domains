import { expect } from "chai";
import { ethers } from "hardhat";
import { CommitmentRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("CommitmentRegistry", function () {
  // Test fixture for deploying contract
  async function deployCommitmentRegistryFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const CommitmentRegistryFactory = await ethers.getContractFactory(
      "CommitmentRegistry"
    );
    const registry = await CommitmentRegistryFactory.deploy();

    return { registry, owner, user1, user2 };
  }

  // Helper function to generate a random commitment
  function generateCommitment(tokenId: number, secret: string): string {
    return ethers.solidityPackedKeccak256(
      ["uint256", "string"],
      [tokenId, secret]
    );
  }

  describe("Deployment", function () {
    it("Should deploy with correct tree depth", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      expect(await registry.TREE_DEPTH()).to.equal(20);
    });

    it("Should deploy with correct max capacity", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      expect(await registry.MAX_LEAVES()).to.equal(2 ** 20);
      expect(await registry.getMaxCapacity()).to.equal(2 ** 20);
    });

    it("Should initialize with zero commitments", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      expect(await registry.nextLeafIndex()).to.equal(0);
      expect(await registry.getCommitmentCount()).to.equal(0);
    });

    it("Should initialize with non-zero Merkle root", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const root = await registry.merkleRoot();
      expect(root).to.not.equal(ethers.ZeroHash);
    });

    it("Should set correct owner", async function () {
      const { registry, owner } = await loadFixture(
        deployCommitmentRegistryFixture
      );

      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should not be full initially", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      expect(await registry.isFull()).to.be.false;
    });
  });

  describe("Adding Commitments", function () {
    it("Should add a commitment successfully", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");

      await expect(registry.addCommitment(commitment))
        .to.emit(registry, "CommitmentAdded")
        .withArgs(commitment, 0, await registry.merkleRoot());
    });

    it("Should increment leaf index after adding commitment", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      const commitment2 = generateCommitment(2, "secret2");

      await registry.addCommitment(commitment1);
      expect(await registry.nextLeafIndex()).to.equal(1);

      await registry.addCommitment(commitment2);
      expect(await registry.nextLeafIndex()).to.equal(2);
    });

    it("Should update Merkle root after adding commitment", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const initialRoot = await registry.merkleRoot();
      const commitment = generateCommitment(1, "secret123");

      await registry.addCommitment(commitment);

      const newRoot = await registry.merkleRoot();
      expect(newRoot).to.not.equal(initialRoot);
    });

    it("Should emit RootUpdated event", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const initialRoot = await registry.merkleRoot();
      const commitment = generateCommitment(1, "secret123");

      await expect(registry.addCommitment(commitment))
        .to.emit(registry, "RootUpdated")
        .withArgs(initialRoot, await registry.merkleRoot());
    });

    it("Should store commitment at correct index", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");
      await registry.addCommitment(commitment);

      expect(await registry.getCommitment(0)).to.equal(commitment);
    });

    it("Should revert if non-owner tries to add commitment", async function () {
      const { registry, user1 } = await loadFixture(
        deployCommitmentRegistryFixture
      );

      const commitment = generateCommitment(1, "secret123");

      await expect(
        registry.connect(user1).addCommitment(commitment)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should revert if commitment is zero", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      await expect(
        registry.addCommitment(ethers.ZeroHash)
      ).to.be.revertedWith("Commitment cannot be zero");
    });

    it("Should revert if commitment already exists", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");

      await registry.addCommitment(commitment);

      await expect(registry.addCommitment(commitment)).to.be.revertedWith(
        "Commitment already exists"
      );
    });

    it("Should handle multiple commitments", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitments = [];
      for (let i = 1; i <= 10; i++) {
        commitments.push(generateCommitment(i, `secret${i}`));
      }

      for (const commitment of commitments) {
        await registry.addCommitment(commitment);
      }

      expect(await registry.getCommitmentCount()).to.equal(10);
    });

    it("Should update root differently for each commitment", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const roots = [];
      roots.push(await registry.merkleRoot());

      for (let i = 1; i <= 5; i++) {
        const commitment = generateCommitment(i, `secret${i}`);
        await registry.addCommitment(commitment);
        roots.push(await registry.merkleRoot());
      }

      // All roots should be different
      const uniqueRoots = new Set(roots);
      expect(uniqueRoots.size).to.equal(6);
    });
  });

  describe("Commitment Queries", function () {
    it("Should check if commitment exists", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");

      expect(await registry.commitmentExists(commitment)).to.be.false;

      await registry.addCommitment(commitment);

      expect(await registry.commitmentExists(commitment)).to.be.true;
    });

    it("Should return false for non-existent commitment", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      const commitment2 = generateCommitment(2, "secret2");

      await registry.addCommitment(commitment1);

      expect(await registry.commitmentExists(commitment2)).to.be.false;
    });

    it("Should get commitment at specific index", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      const commitment2 = generateCommitment(2, "secret2");

      await registry.addCommitment(commitment1);
      await registry.addCommitment(commitment2);

      expect(await registry.getCommitment(0)).to.equal(commitment1);
      expect(await registry.getCommitment(1)).to.equal(commitment2);
    });

    it("Should revert when getting commitment at invalid index", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      await expect(registry.getCommitment(0)).to.be.revertedWith(
        "Invalid leaf index"
      );

      const commitment = generateCommitment(1, "secret1");
      await registry.addCommitment(commitment);

      await expect(registry.getCommitment(5)).to.be.revertedWith(
        "Invalid leaf index"
      );
    });
  });

  describe("Merkle Proof Generation", function () {
    it("Should generate proof for single commitment", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");
      await registry.addCommitment(commitment);

      const proof = await registry.getMerkleProof(0);

      expect(proof.length).to.equal(20); // TREE_DEPTH
    });

    it("Should generate different proofs for different indices", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      const commitment2 = generateCommitment(2, "secret2");

      await registry.addCommitment(commitment1);
      await registry.addCommitment(commitment2);

      const proof1 = await registry.getMerkleProof(0);
      const proof2 = await registry.getMerkleProof(1);

      expect(proof1).to.not.deep.equal(proof2);
    });

    it("Should revert when generating proof for invalid index", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      await expect(registry.getMerkleProof(0)).to.be.revertedWith(
        "Invalid leaf index"
      );
    });

    it("Should generate valid proofs for multiple commitments", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      // Add multiple commitments
      for (let i = 1; i <= 5; i++) {
        const commitment = generateCommitment(i, `secret${i}`);
        await registry.addCommitment(commitment);
      }

      // Generate proofs for all commitments
      for (let i = 0; i < 5; i++) {
        const proof = await registry.getMerkleProof(i);
        expect(proof.length).to.equal(20);
      }
    });
  });

  describe("Merkle Proof Verification", function () {
    it("Should verify valid proof", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");
      await registry.addCommitment(commitment);

      const proof = await registry.getMerkleProof(0);
      const isValid = await registry.verifyCommitment(commitment, 0, proof);

      expect(isValid).to.be.true;
    });

    it("Should verify multiple valid proofs", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      // Add multiple commitments
      const commitments = [];
      for (let i = 1; i <= 5; i++) {
        const commitment = generateCommitment(i, `secret${i}`);
        commitments.push(commitment);
        await registry.addCommitment(commitment);
      }

      // Verify all proofs
      for (let i = 0; i < commitments.length; i++) {
        const proof = await registry.getMerkleProof(i);
        const isValid = await registry.verifyCommitment(
          commitments[i],
          i,
          proof
        );
        expect(isValid).to.be.true;
      }
    });

    it("Should reject invalid proof", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      const commitment2 = generateCommitment(2, "secret2");

      await registry.addCommitment(commitment1);
      await registry.addCommitment(commitment2);

      // Get proof for commitment1 but try to verify commitment2 with it
      const proof1 = await registry.getMerkleProof(0);

      await expect(
        registry.verifyCommitment(commitment2, 0, proof1)
      ).to.be.revertedWith("Commitment mismatch");
    });

    it("Should reject proof with wrong length", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");
      await registry.addCommitment(commitment);

      const shortProof = [ethers.randomBytes(32)];

      await expect(
        registry.verifyCommitment(commitment, 0, shortProof)
      ).to.be.revertedWith("Invalid proof length");
    });

    it("Should reject proof for invalid index", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment = generateCommitment(1, "secret123");
      await registry.addCommitment(commitment);

      const proof = await registry.getMerkleProof(0);

      await expect(
        registry.verifyCommitment(commitment, 5, proof)
      ).to.be.revertedWith("Invalid leaf index");
    });

    it("Should maintain proof validity after adding new commitments", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      await registry.addCommitment(commitment1);

      const proof1 = await registry.getMerkleProof(0);
      const isValid1Before = await registry.verifyCommitment(
        commitment1,
        0,
        proof1
      );
      expect(isValid1Before).to.be.true;

      // Add more commitments
      for (let i = 2; i <= 5; i++) {
        const commitment = generateCommitment(i, `secret${i}`);
        await registry.addCommitment(commitment);
      }

      // Original proof should still be valid
      const isValid1After = await registry.verifyCommitment(
        commitment1,
        0,
        proof1
      );
      expect(isValid1After).to.be.true;
    });
  });

  describe("Hash Functions", function () {
    it("Should hash pair consistently", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const left = ethers.randomBytes(32);
      const right = ethers.randomBytes(32);

      const hash1 = await registry.hashPair(left, right);
      const hash2 = await registry.hashPair(left, right);

      expect(hash1).to.equal(hash2);
    });

    it("Should produce different hashes for different inputs", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const left1 = ethers.randomBytes(32);
      const right1 = ethers.randomBytes(32);
      const left2 = ethers.randomBytes(32);
      const right2 = ethers.randomBytes(32);

      const hash1 = await registry.hashPair(left1, right1);
      const hash2 = await registry.hashPair(left2, right2);

      expect(hash1).to.not.equal(hash2);
    });

    it("Should be order-sensitive", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const a = ethers.randomBytes(32);
      const b = ethers.randomBytes(32);

      const hashAB = await registry.hashPair(a, b);
      const hashBA = await registry.hashPair(b, a);

      expect(hashAB).to.not.equal(hashBA);
    });
  });

  describe("Tree Capacity", function () {
    it("Should track if tree is full", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      expect(await registry.isFull()).to.be.false;

      // Add a commitment
      const commitment = generateCommitment(1, "secret1");
      await registry.addCommitment(commitment);

      expect(await registry.isFull()).to.be.false;
    });

    it("Should return correct commitment count", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      expect(await registry.getCommitmentCount()).to.equal(0);

      for (let i = 1; i <= 10; i++) {
        const commitment = generateCommitment(i, `secret${i}`);
        await registry.addCommitment(commitment);
        expect(await registry.getCommitmentCount()).to.equal(i);
      }
    });
  });

  describe("Edge Cases", function () {
    it("Should handle commitments with same tokenId but different secrets", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "secret1");
      const commitment2 = generateCommitment(1, "secret2");

      await registry.addCommitment(commitment1);
      await registry.addCommitment(commitment2);

      expect(await registry.getCommitmentCount()).to.equal(2);
      expect(commitment1).to.not.equal(commitment2);
    });

    it("Should handle commitments with different tokenIds but same secret", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      const commitment1 = generateCommitment(1, "sameSecret");
      const commitment2 = generateCommitment(2, "sameSecret");

      await registry.addCommitment(commitment1);
      await registry.addCommitment(commitment2);

      expect(await registry.getCommitmentCount()).to.equal(2);
      expect(commitment1).to.not.equal(commitment2);
    });

    it("Should handle large number of commitments efficiently", async function () {
      const { registry } = await loadFixture(deployCommitmentRegistryFixture);

      // Add 50 commitments
      for (let i = 1; i <= 50; i++) {
        const commitment = generateCommitment(i, `secret${i}`);
        await registry.addCommitment(commitment);
      }

      expect(await registry.getCommitmentCount()).to.equal(50);

      // Verify random commitments
      const randomIndices = [0, 10, 25, 40, 49];
      for (const idx of randomIndices) {
        const commitment = generateCommitment(idx + 1, `secret${idx + 1}`);
        const proof = await registry.getMerkleProof(idx);
        const isValid = await registry.verifyCommitment(commitment, idx, proof);
        expect(isValid).to.be.true;
      }
    });
  });
});