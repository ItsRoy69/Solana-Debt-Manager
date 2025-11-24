'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import BN from 'bn.js';

export default function AdminPage() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
  
  const [collateralMint, setCollateralMint] = useState('');
  const [ltv, setLtv] = useState('75');
  const [liquidationThreshold, setLiquidationThreshold] = useState('80');
  const [liquidationBonus, setLiquidationBonus] = useState('5');
  const [collateralPrice, setCollateralPrice] = useState('1');
  
  const [borrowMint, setBorrowMint] = useState('');
  const [interestRate, setInterestRate] = useState('5');
  const [borrowPrice, setBorrowPrice] = useState('1');
  
  const [vaultMint, setVaultMint] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [protocolConfig, setProtocolConfig] = useState<any>(null);
  const [adminAddress, setAdminAddress] = useState<string>('');

  useEffect(() => {
    fetchProtocolConfig();
  }, [program]);

  const fetchProtocolConfig = async () => {
    if (!program) return;

    try {
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      const config = await program.account.protocolConfig.fetch(configPda);
      setProtocolConfig(config);
      setAdminAddress(config.admin.toString());
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const handleAddCollateral = async () => {
    if (!publicKey || !program || !collateralMint) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(collateralMint);
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      await program.methods
        .addSupportedCollateral(
          mintPubkey,
          new BN(parseFloat(ltv) * 10000),
          new BN(parseFloat(liquidationThreshold) * 10000),
          new BN(parseFloat(liquidationBonus) * 10000),
          new BN(parseFloat(collateralPrice) * 1e9)
        )
        .accounts({
          config: configPda,
          admin: publicKey,
        })
        .rpc();

      alert('✅ Collateral token added successfully!');
      setCollateralMint('');
      fetchProtocolConfig();
    } catch (err: any) {
      console.error('Error adding collateral:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBorrow = async () => {
    if (!publicKey || !program || !borrowMint) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(borrowMint);
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      await program.methods
        .addSupportedBorrow(
          mintPubkey,
          new BN(parseFloat(interestRate) * 1e8),
          new BN(parseFloat(borrowPrice) * 1e9)
        )
        .accounts({
          config: configPda,
          admin: publicKey,
        })
        .rpc();

      alert('✅ Borrow asset added successfully!');
      setBorrowMint('');
      fetchProtocolConfig();
    } catch (err: any) {
      console.error('Error adding borrow asset:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeVault = async () => {
    if (!publicKey || !program || !vaultMint) {
      alert('Please enter mint address');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(vaultMint);

      await program.methods
        .initializeVault()
        .accountsPartial({
          mint: mintPubkey,
          admin: publicKey,
        })
        .rpc();

      alert('✅ Vault initialized successfully!');
      setVaultMint('');
    } catch (err: any) {
      console.error('Error initializing vault:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Please connect your wallet</p>
      </div>
    );
  }

  const isAdmin = adminAddress && publicKey.toString() === adminAddress;

  if (!isAdmin && adminAddress) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-2">⛔ Access Denied</p>
          <p className="text-gray-400">Only the protocol admin can access this page.</p>
          <p className="text-gray-500 text-sm mt-2">Admin: {adminAddress}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">🛠️ Protocol Admin</h1>

      {/* Protocol Info */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Protocol Configuration</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Admin Address</p>
            <p className="text-white font-mono">{adminAddress}</p>
          </div>
          <div>
            <p className="text-gray-400">Supported Collaterals</p>
            <p className="text-white">{protocolConfig?.supportedCollaterals?.length || 0}</p>
          </div>
          <div>
            <p className="text-gray-400">Supported Borrows</p>
            <p className="text-white">{protocolConfig?.supportedBorrows?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Collateral Token */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Add Collateral Token</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2 text-sm">Token Mint Address</label>
              <input
                type="text"
                placeholder="Token mint public key"
                value={collateralMint}
                onChange={(e) => setCollateralMint(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">LTV (%)</label>
                <input
                  type="number"
                  value={ltv}
                  onChange={(e) => setLtv(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  step="1"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Liquidation Threshold (%)</label>
                <input
                  type="number"
                  value={liquidationThreshold}
                  onChange={(e) => setLiquidationThreshold(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  step="1"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Liquidation Bonus (%)</label>
                <input
                  type="number"
                  value={liquidationBonus}
                  onChange={(e) => setLiquidationBonus(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Price (USD)</label>
                <input
                  type="number"
                  value={collateralPrice}
                  onChange={(e) => setCollateralPrice(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <button
              onClick={handleAddCollateral}
              disabled={loading || !collateralMint}
              className="w-full py-3 px-6 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Add Collateral Token'}
            </button>
          </div>
        </div>

        {/* Add Borrow Asset */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Add Borrow Asset</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2 text-sm">Token Mint Address</label>
              <input
                type="text"
                placeholder="Token mint public key"
                value={borrowMint}
                onChange={(e) => setBorrowMint(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">Price (USD)</label>
                <input
                  type="number"
                  value={borrowPrice}
                  onChange={(e) => setBorrowPrice(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <button
              onClick={handleAddBorrow}
              disabled={loading || !borrowMint}
              className="w-full py-3 px-6 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Add Borrow Asset'}
            </button>
          </div>
        </div>

        {/* Initialize Vault */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Initialize Vault</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2 text-sm">Token Mint Address</label>
              <input
                type="text"
                placeholder="Token mint public key"
                value={vaultMint}
                onChange={(e) => setVaultMint(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <p className="text-gray-400 text-sm">
              ⚠️ Initialize vault after adding a token as collateral. This creates the vault account for deposits.
            </p>
            <button
              onClick={handleInitializeVault}
              disabled={loading || !vaultMint}
              className="w-full py-3 px-6 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Initialize Vault'}
            </button>
          </div>
        </div>

        {/* Token List */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Supported Tokens</h2>
          <div className="space-y-4">
            {protocolConfig?.supportedCollaterals?.length > 0 ? (
              protocolConfig.supportedCollaterals.map((token: any, idx: number) => (
                <div key={idx} className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-white font-mono text-sm mb-2">{token.mint.toString()}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-gray-400">LTV: {token.ltv / 10000}%</p>
                    <p className="text-gray-400">Liq Threshold: {token.liquidationThreshold / 10000}%</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No tokens configured yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
