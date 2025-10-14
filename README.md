# ZK-Domains: Privacy-Preserving Decentralized Domain System

## Statement

To build a decentralized domain name system that empowers users with true ownership and control, leveraging Zero-Knowledge Proofs to ensure that domain verification never compromises user privacy.

## The Core Problem

Standard domain systems are centralized and insecure. While blockchain-based dDNS solves the ownership problem by using NFTs, it introduces a new one: **transparency**. On a public blockchain, anyone can link a domain NFT to a specific wallet, exposing the owner to risks like:

- Targeted hacking
- Doxing and identity exposure
- Censorship
- Loss of privacy

This forces a trade-off between decentralized ownership and personal privacy.

## Our Solution

ZK-Domains severs the public link between a domain and its owner using a novel two-layer architecture:

### 1. On-Chain Foundation
Domain names are minted as NFTs for verifiable ownership. However, instead of publicly linking the NFT to a wallet, the owner submits a **cryptographic commitment** (a secret hash) to a Merkle Tree on a smart contract. This commitment proves a domain is registered without revealing which one or by whom.

### 2. Off-Chain Privacy
When a service needs to verify ownership, the user generates a **zk-SNARK proof** locally on their device. This proof mathematically confirms that the user owns the secret corresponding to a specific domain's commitment in the Merkle tree. This proof can be verified on-chain by anyone without ever revealing the owner's wallet or their secret.

> **Analogy**: You can prove you hold the key to a house without ever having to show your face, your ID, or the key itself.

## Key Features

- **Private Domain Registration**: Register your domain's ownership on the blockchain without creating a public link to your personal wallet
- **Anonymous Ownership Verification**: Log in to services, claim airdrops, or join DAOs by proving you own a domain without revealing your identity
- **Self-Sovereign Identity**: Establishes a foundation for a truly decentralized identity where users control what information is shared and when
- **Censorship-Resistant & Secure**: Inherits the core benefits of decentralization, making domains resistant to hijacking and censorship

## Target Audience

- **Developers & dApps**: Who need a secure and private way to authenticate users and manage access control
- **Privacy Advocates & Journalists**: Who require anonymous web presence and authorship
- **Decentralized Autonomous Organizations (DAOs)**: For private, token-gated community access and governance

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        ZK-Domains System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐  │
│  │   Smart      │      │   ZK Circuit │      │  Frontend │  │
│  │  Contracts   │◄────►│   (Circom)   │◄────►│   dApp    │  │
│  │  (Solidity)  │      │              │      │ (Next.js) │  │
│  └──────────────┘      └──────────────┘      └───────────┘  │
│         │                      │                     │      │
│         │                      │                     │      │
│  ┌──────▼──────────────────────▼─────────────────────▼────┐ │
│  │              Ethereum Blockchain (Sepolia)              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

This is a monorepo managed with pnpm workspaces:

```
zk-domains/
├── packages/
│   ├── contracts/         # Smart contracts (Hardhat + Solidity)
│   ├── circuits/          # ZK circuits (Circom + snarkjs)
│   └── dapp/              # Frontend application (Next.js + React)
├── pnpm-workspace.yaml    # Workspace configuration
├── package.json           # Root package configuration
└── README.md             # This file
```

## 🛠️ Technology Stack

### Blockchain & Smart Contracts
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Language**: Solidity ^0.8.20
- **Framework**: Hardhat
- **Libraries**: OpenZeppelin Contracts

### Zero-Knowledge Proofs
- **Circuit Language**: Circom 2.0
- **Proving Library**: snarkjs

### Frontend dApp
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Blockchain Interaction**: Viem
- **Wallet Connectivity**: Wagmi + RainbowKit

### Development Tools
- **Package Manager**: pnpm
- **Version Control**: Git
- **Code Editor**: VS Code (recommended)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

<!-- ### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd zk-domains
```

2. Install dependencies:
```bash
pnpm install
``` -->
<!-- 
### Available Commands

```bash
# Smart Contracts
pnpm contracts:compile    # Compile Solidity contracts
pnpm contracts:test       # Run contract tests
pnpm contracts:deploy     # Deploy to testnet

# ZK Circuits
pnpm circuits:compile     # Compile Circom circuits
pnpm circuits:setup       # Perform trusted setup

# Frontend dApp
pnpm dapp:dev            # Start development server
pnpm dapp:build          # Build for production

# Utility
pnpm clean               # Clean all build artifacts
``` -->
<!-- 
## 📚 Documentation

Detailed documentation for each package:

- [Smart Contracts](./packages/contracts/README.md)
- [ZK Circuits](./packages/circuits/README.md)
- [Frontend dApp](./packages/dapp/README.md)

## 🗺️ Development Roadmap

### ✅ Milestone 1: Core Smart Contract Development
- [ ] DomainNFT.sol (ERC-721)
- [ ] CommitmentRegistry.sol (Merkle tree)
- [ ] Deployment scripts
- [ ] Comprehensive unit tests

### 🔐 Milestone 2: ZKP Circuit Development
- [ ] Domain ownership circuit (Circom)
- [ ] Circuit compilation
- [ ] Trusted setup ceremony
- [ ] Generate Verifier.sol

### 💻 Milestone 3: Off-Chain Prover & Wallet Logic
- [ ] Proof generation module (TypeScript)
- [ ] Wallet integration
- [ ] Domain data fetching

### 🌐 Milestone 4: Frontend dApp Integration
- [ ] Domain registration UI
- [ ] Ownership verification UI
- [ ] Proof submission interface
- [ ] Wallet connection

### 🚀 Milestone 5: Testing and Testnet Deployment
- [ ] Integration tests
- [ ] Sepolia testnet deployment
- [ ] Frontend hosting (Vercel/Netlify)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Circom Documentation](https://docs.circom.io/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## ⚠️ Security Notice

This project is under active development and has not been audited. Do not use in production without a professional security audit.

---

**Built with ❤️ for the decentralized web** -->