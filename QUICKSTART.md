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

After building, you must sync the generated IDL and types to the frontend:
```bash
cd app
npm run sync-idl
```

This ensures the frontend has the latest contract definitions.

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
