# 🚀 Quick Start Guide

## Get the Frontend Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd app
npm install
```

### Step 2: Build the Anchor Program
```bash
cd ..
anchor build
```

This generates the IDL file that the frontend needs.

### Step 3: Update Configuration (Optional)

If testing on localnet, edit `app/src/contexts/WalletContextProvider.tsx`:

```typescript
// Change from:
const endpoint = useMemo(() => clusterApiUrl(network), [network]);

// To:
const endpoint = 'http://127.0.0.1:8899';
```

### Step 4: Start the Frontend
```bash
cd app
npm run dev
```

### Step 5: Open Your Browser
Visit: **http://localhost:3000**

---

## What You'll See

1. **Landing Page**: "Connect your wallet to get started"
2. **After Connecting**: Dashboard with position overview
3. **Create Account**: Button to create your debt account (one-time)
4. **Dashboard**: View collateral, debt, and health ratio

---

## Test the Complete Flow

### 1. Initialize Protocol (Admin Only)
Run from the root directory:
```bash
anchor test
```

This initializes the protocol config.

### 2. Create Debt Account
Click "Create Account" button in the UI.

### 3. Deposit Collateral
- Go to `/deposit` page
- Enter token mint address
- Enter amount
- Click "Deposit Collateral"

### 4. Borrow Assets
- Go to `/borrow` page
- Enter borrow asset mint
- Enter amount
- Click "Borrow Assets"

### 5. Monitor Health
- Return to dashboard (`/`)
- Check your health ratio
- Green = healthy, Red = at risk

### 6. Liquidate (Optional)
- Go to `/liquidate` page
- View unhealthy positions
- Execute liquidations for profit

---

## Common Issues

### "Cannot find module '@solana/wallet-adapter-react'"
Solution: Make sure you ran `npm install` in the `app/` directory.

### "IDL file not found"
Solution: Run `anchor build` from the root directory.

### "Program not deployed"
Solution: Deploy the program first:
```bash
anchor deploy
```

### "Transaction failed"
Check:
1. Is your wallet connected to the right network?
2. Do you have SOL for transaction fees?
3. Did you initialize the protocol?
4. Are the smart contract bugs fixed?

---

## Smart Contract Fixes Required

⚠️ **The frontend is complete, but the smart contract has bugs that prevent full functionality:**

1. **Missing LTV checks** in borrow function
2. **Missing health checks** in withdraw function
3. **No vault initialization** instruction
4. **No admin functions** to add assets

See `FRONTEND_GUIDE.md` for detailed fix instructions.

---

## Development Mode

The frontend is in development mode with:
- Hot reloading
- TypeScript type checking
- ESLint enabled
- Tailwind CSS JIT compiler

Edit any file and see changes instantly!

---

## Build for Production

```bash
cd app
npm run build
npm start
```

---


## Deploying to Devnet / Mainnet

When you are ready to deploy your application to a public network (Devnet or Mainnet), you cannot rely on `anchor test` to initialize the protocol, as that is for local testing only.

Instead, follow this procedure:

1.  **Deploy the Program**:
    ```bash
    anchor deploy --provider.cluster devnet
    ```

2.  **Initialize the Protocol**:
    We have provided a dedicated script for this purpose. This script initializes the global state of your program on the blockchain.
    ```bash
    npx ts-node scripts/initialize-protocol.ts
    ```
    *Note: Ensure your `Anchor.toml` and environment variables are configured for the correct network.*

---

**Happy coding! 🎉**
