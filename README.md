# 🔐 LockMint — Solana Escrow dApp

**A decentralized token escrow application built on Solana using Rust, Anchor, and React.**

LockMint is a Solana-based escrow dApp that enables two parties to exchange SPL tokens securely without requiring a centralized intermediary.

A maker creates an escrow offer by depositing Token A and specifying the amount of Token B they want in return. A taker can accept the offer, triggering the token exchange. If the offer is no longer needed, the maker can refund their deposited tokens.

## ✨ Features

- **Create Escrow:** Deposit tokens and create an exchange offer.
- **Take Offer:** Accept an existing offer and execute the token swap.
- **Refund Offer:** Cancel an active offer and recover deposited tokens.
- **PDA-based Escrow:** Uses Program Derived Addresses for escrow account management.
- **Phantom Wallet Integration:** Connect and interact using a Solana wallet.
- **On-chain Execution:** Transactions are executed and verified on Solana Devnet.
- **Token Support:** Supports SPL Token and Token-2022 interfaces, subject to program constraints.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Blockchain | Solana |
| Smart Contract | Rust, Anchor Framework |
| Token Standard | SPL Token, Token-2022 |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Wallet | Phantom |
| Solana SDK | Solana Web3.js, Anchor TypeScript |
| Network | Solana Devnet |

## 🏗️ Architecture

LockMint follows an on-chain escrow architecture.

1. The maker deposits Token A into a vault controlled by an escrow PDA.
2. The escrow account stores the maker, token mint addresses, requested amount and PDA bump.
3. The taker accepts the offer by transferring Token B to the maker.
4. The program transfers Token A from the vault to the taker.
5. The escrow account and vault are closed after a successful exchange.

Alternatively, the maker can refund the deposited tokens, closing the escrow and vault.

## 🔄 Escrow Instructions

| Instruction | Description |
|---|---|
| `make` | Creates an escrow and deposits Token A. |
| `take` | Exchanges Token B for Token A and closes the escrow. |
| `refund` | Returns deposited Token A to the maker and closes the escrow. |

## 🧩 Project Structure

```text
04-escrow/
├── programs/
│   └── anchor_escrow/
│       └── src/
│           ├── instructions/
│           │   ├── make.rs
│           │   ├── take.rs
│           │   └── refund.rs
│           ├── state.rs
│           └── lib.rs
│
├── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── solana/
│   │   ├── idl/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── Anchor.toml
├── Cargo.toml
└── README.md
```

## 🌐 Solana Devnet Deployment

| Detail | Value |
|---|---|
| Network | Solana Devnet |
| Program ID | `E97PfH3cbDVEdNJHhb3C7QRgWDrNMMfSH1Qdoi6YqQyE` |
| RPC Endpoint | `https://api.devnet.solana.com` |

[View Program on Solana Explorer](https://explorer.solana.com/address/E97PfH3cbDVEdNJHhb3C7QRgWDrNMMfSH1Qdoi6YqQyE?cluster=devnet)

## ⚙️ Run Locally

### Prerequisites

- Rust
- Solana CLI
- Anchor Framework
- Node.js and npm
- Phantom Wallet
- Solana Devnet SOL for transaction fees

### 1. Clone the repository

```bash
git clone https://github.com/sanjay040505/LockMint.git
cd 04-escrow
```

### 2. Build the Anchor program

```bash
anchor build
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL in your browser and connect your Phantom wallet using Solana Devnet.

## 🧪 Testing & Verification

The core escrow instructions were tested through actual Solana Devnet transactions.

- `make` — Successfully created an escrow and deposited tokens.
- `take` — Successfully exchanged tokens between maker and taker.
- `refund` — Successfully returned deposited tokens to the maker.
- Verified token balances and escrow/vault closure after transactions.

## 📚 Key Concepts Explored

- Solana Program Derived Addresses (PDAs)
- Anchor account constraints and serialization
- Cross-Program Invocations (CPI)
- SPL Token transfers
- Associated Token Accounts (ATAs)
- Escrow account lifecycle
- Wallet integration and transaction signing
- Solana Devnet deployment

## ⚠️ Notes

- This project is deployed on Solana Devnet for learning and demonstration purposes.
- Both token mints in an escrow must use the same supported token program.
- Token-2022 extensions requiring additional transfer handling may not be supported.
- This project is not intended for production financial use.

## 👨‍💻 Author

**Sanjay**

Built as a hands-on Solana blockchain development project to explore smart contracts, token transfers, and decentralized escrow mechanisms.

---

⭐ If you find this project interesting, feel free to explore the code and learn from it.