// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CommitmentRegistry
 * @notice Manages a Merkle tree of cryptographic commitments for privacy-preserving domain verification
 * @dev Implements an incremental Merkle tree for efficient commitment storage and verification
 * 
 * This contract maintains a Merkle tree where each leaf is a commitment hash.
 * Commitments are added incrementally, and the Merkle root is updated with each insertion.
 * The contract stores the path hashes needed to verify any commitment in the tree.
 * 
 * Privacy Model:
 * - A commitment is hash(tokenId, secret) where secret is known only to the user
 * - The Merkle tree proves a commitment exists without revealing which tokenId or user
 * - Zero-knowledge proofs can verify ownership without exposing the secret
 */
contract CommitmentRegistry is Ownable {
    // Tree depth - supports up to 2^20 (1,048,576) commitments
    uint8 public constant TREE_DEPTH = 20;

    // Maximum number of leaves (commitments) the tree can hold
    uint256 public constant MAX_LEAVES = 2 ** TREE_DEPTH;

    // Current Merkle root of the commitment tree
    bytes32 public merkleRoot;

    // Number of commitments inserted into the tree
    uint256 public nextLeafIndex;

    // Mapping from leaf index to commitment hash
    mapping(uint256 => bytes32) public commitments;

    // Store the last hash at each level for efficient incremental updates
    // Level 0 is leaves, level TREE_DEPTH is root
    mapping(uint8 => bytes32) private lastLevelHash;

    // Zero value used for empty tree nodes
    bytes32 public constant ZERO_VALUE = bytes32(0);

    /**
     * @notice Emitted when a new commitment is added to the tree
     * @param commitment The commitment hash that was added
     * @param leafIndex The index of the leaf in the tree
     * @param newRoot The new Merkle root after insertion
     */
    event CommitmentAdded(
        bytes32 indexed commitment,
        uint256 indexed leafIndex,
        bytes32 newRoot
    );

    /**
     * @notice Emitted when the Merkle root is updated
     * @param oldRoot The previous Merkle root
     * @param newRoot The new Merkle root
     */
    event RootUpdated(bytes32 oldRoot, bytes32 newRoot);

    /**
     * @notice Contract constructor
     * @dev Initializes the tree with zero values and computes initial root
     */
    constructor() Ownable(msg.sender) {
        // Initialize the tree with the zero value
        bytes32 currentHash = ZERO_VALUE;

        // Compute initial root by hashing up the tree
        for (uint8 i = 0; i < TREE_DEPTH; i++) {
            lastLevelHash[i] = currentHash;
            currentHash = hashPair(currentHash, currentHash);
        }

        merkleRoot = currentHash;
        lastLevelHash[TREE_DEPTH] = currentHash;
    }

    /**
     * @notice Add a new commitment to the Merkle tree
     * @dev Only the contract owner can add commitments
     * @param commitment The commitment hash to add (should be hash(tokenId, secret))
     * @return leafIndex The index where the commitment was inserted
     * 
     * Requirements:
     * - Commitment must not be zero
     * - Commitment must not already exist in the tree
     * - Tree must not be full
     * - Only owner can call
     */
    function addCommitment(bytes32 commitment) external onlyOwner returns (uint256) {
        require(commitment != bytes32(0), "Commitment cannot be zero");
        require(nextLeafIndex < MAX_LEAVES, "Tree is full");
        require(!commitmentExists(commitment), "Commitment already exists");

        uint256 leafIndex = nextLeafIndex;
        commitments[leafIndex] = commitment;
        nextLeafIndex++;

        bytes32 oldRoot = merkleRoot;
        bytes32 newRoot = _updateTree(commitment, leafIndex);
        merkleRoot = newRoot;

        emit CommitmentAdded(commitment, leafIndex, newRoot);
        emit RootUpdated(oldRoot, newRoot);

        return leafIndex;
    }

    /**
     * @notice Update the Merkle tree after inserting a new leaf
     * @dev Incrementally updates the tree by computing new hashes up to the root
     * @param leaf The commitment hash being inserted
     * @param index The index where the leaf is inserted
     * @return The new Merkle root
     */
    function _updateTree(bytes32 leaf, uint256 index) private returns (bytes32) {
        bytes32 currentHash = leaf;
        uint256 currentIndex = index;

        for (uint8 level = 0; level < TREE_DEPTH; level++) {
            bytes32 left;
            bytes32 right;

            if (currentIndex % 2 == 0) {
                // Current node is a left child
                left = currentHash;
                right = lastLevelHash[level];
            } else {
                // Current node is a right child
                left = lastLevelHash[level];
                right = currentHash;
            }

            currentHash = hashPair(left, right);
            lastLevelHash[level] = currentHash;
            currentIndex = currentIndex / 2;
        }

        return currentHash;
    }

    /**
     * @notice Hash two nodes to create their parent hash
     * @dev Uses keccak256 for hashing (can be replaced with more efficient hash)
     * @param left Left child hash
     * @param right Right child hash
     * @return Parent node hash
     */
    function hashPair(bytes32 left, bytes32 right) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(left, right));
    }

    /**
     * @notice Check if a commitment exists in the tree
     * @param commitment The commitment hash to check
     * @return exists True if the commitment exists, false otherwise
     */
    function commitmentExists(bytes32 commitment) public view returns (bool) {
        for (uint256 i = 0; i < nextLeafIndex; i++) {
            if (commitments[i] == commitment) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Verify a Merkle proof for a commitment
     * @dev Reconstructs the root using the proof and checks if it matches current root
     * @param commitment The commitment hash to verify
     * @param leafIndex The index of the commitment in the tree
     * @param proof Array of sibling hashes from leaf to root
     * @return valid True if the proof is valid, false otherwise
     */
    function verifyCommitment(
        bytes32 commitment,
        uint256 leafIndex,
        bytes32[] calldata proof
    ) external view returns (bool) {
        require(proof.length == TREE_DEPTH, "Invalid proof length");
        require(leafIndex < nextLeafIndex, "Invalid leaf index");
        require(commitments[leafIndex] == commitment, "Commitment mismatch");

        bytes32 computedHash = commitment;
        uint256 currentIndex = leafIndex;

        for (uint8 i = 0; i < TREE_DEPTH; i++) {
            bytes32 proofElement = proof[i];

            if (currentIndex % 2 == 0) {
                // Current node is a left child
                computedHash = hashPair(computedHash, proofElement);
            } else {
                // Current node is a right child
                computedHash = hashPair(proofElement, computedHash);
            }

            currentIndex = currentIndex / 2;
        }

        return computedHash == merkleRoot;
    }

    /**
     * @notice Generate a Merkle proof for a commitment at a given index
     * @dev Computes the sibling hashes needed to reconstruct the root
     * @param leafIndex The index of the commitment in the tree
     * @return proof Array of sibling hashes from leaf to root
     */
    function getMerkleProof(uint256 leafIndex) external view returns (bytes32[] memory) {
        require(leafIndex < nextLeafIndex, "Invalid leaf index");

        bytes32[] memory proof = new bytes32[](TREE_DEPTH);
        uint256 currentIndex = leafIndex;

        for (uint8 level = 0; level < TREE_DEPTH; level++) {
            uint256 siblingIndex;

            if (currentIndex % 2 == 0) {
                // Current is left, sibling is right
                siblingIndex = currentIndex + 1;
            } else {
                // Current is right, sibling is left
                siblingIndex = currentIndex - 1;
            }

            // Get sibling hash
            if (siblingIndex < nextLeafIndex) {
                // Sibling exists, compute its hash by traversing
                proof[level] = _getNodeHash(siblingIndex, level);
            } else {
                // Sibling doesn't exist, use the last hash at this level
                proof[level] = lastLevelHash[level];
            }

            currentIndex = currentIndex / 2;
        }

        return proof;
    }

    /**
     * @notice Get the hash of a node at a specific index and level
     * @dev Helper function to compute node hashes during proof generation
     * @param index The index of the node
     * @param level The level of the node (0 = leaf level)
     * @return The hash of the node
     */
    function _getNodeHash(uint256 index, uint8 level) private view returns (bytes32) {
        if (level == 0) {
            // Leaf level
            if (index < nextLeafIndex) {
                return commitments[index];
            } else {
                return ZERO_VALUE;
            }
        }

        // Internal node - compute by hashing children
        uint256 leftChildIndex = index * 2;
        uint256 rightChildIndex = leftChildIndex + 1;

        bytes32 leftHash = _getNodeHash(leftChildIndex, level - 1);
        bytes32 rightHash = _getNodeHash(rightChildIndex, level - 1);

        return hashPair(leftHash, rightHash);
    }

    /**
     * @notice Get the commitment at a specific leaf index
     * @param leafIndex The index of the leaf
     * @return The commitment hash at that index
     */
    function getCommitment(uint256 leafIndex) external view returns (bytes32) {
        require(leafIndex < nextLeafIndex, "Invalid leaf index");
        return commitments[leafIndex];
    }

    /**
     * @notice Get the current number of commitments in the tree
     * @return The number of commitments
     */
    function getCommitmentCount() external view returns (uint256) {
        return nextLeafIndex;
    }

    /**
     * @notice Get the maximum capacity of the tree
     * @return The maximum number of commitments
     */
    function getMaxCapacity() external pure returns (uint256) {
        return MAX_LEAVES;
    }

    /**
     * @notice Check if the tree is full
     * @return True if the tree is at maximum capacity
     */
    function isFull() external view returns (bool) {
        return nextLeafIndex >= MAX_LEAVES;
    }

    /**
     * @notice Get the current Merkle root
     * @return The current root hash
     */
    function getRoot() external view returns (bytes32) {
        return merkleRoot;
    }
}