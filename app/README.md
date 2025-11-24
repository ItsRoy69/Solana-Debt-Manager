# Debt Manager Frontend

Next.js frontend for the Solana Debt Manager DeFi protocol.

## Features

- 🔐 Wallet connection (Phantom, Solflare)
- 📊 Dashboard with position overview and health ratio
- 💰 Deposit and withdraw collateral
- 📈 Borrow and repay synthetic assets
- ⚡ Liquidation interface for liquidators
- 🎨 Modern UI with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure the IDL is generated from the Anchor program:
```bash
cd ..
anchor build
```

3. Update the program ID in `src/contexts/AnchorContextProvider.tsx` if needed.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

- **Network**: Currently set to `Devnet` in `WalletContextProvider.tsx`
- For local testing, change the endpoint to `http://127.0.0.1:8899`
- **Program ID**: Update in `AnchorContextProvider.tsx` to match your deployed program

## Important Notes

⚠️ **Token Account Derivation**: The current implementation uses placeholder values for user token accounts. You need to implement proper Associated Token Account (ATA) derivation using:

```typescript
import { getAssociatedTokenAddress } from '@solana/spl-token';

const userTokenAccount = await getAssociatedTokenAddress(
  mintPubkey,
  publicKey
);
```

⚠️ **Contract Issues**: The smart contract has some critical bugs that need to be fixed:
- Missing LTV checks in borrow function
- Missing health checks in withdraw function
- Vault initialization not implemented

## Pages

- `/` - Dashboard (position overview, health ratio)
- `/deposit` - Deposit/withdraw collateral
- `/borrow` - Borrow/repay debt
- `/liquidate` - Liquidation dashboard for liquidators

## Development Roadmap

See the main README.md for the complete development roadmap and priorities.
