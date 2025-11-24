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
  const [collateralPriceFeed, setCollateralPriceFeed] = useState('');
  
  const [borrowMint, setBorrowMint] = useState('');
  const [interestRate, setInterestRate] = useState('5');
  const [borrowPriceFeed, setBorrowPriceFeed] = useState('');
  
  const [vaultMint, setVaultMint] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [protocolConfig, setProtocolConfig] = useState<any>(null);

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
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const handleInitialize = async () => {
    if (!publicKey || !program) {
      alert('Please connect wallet');
      return;
    }

    setLoading(true);
    try {
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      await program.methods
        .initializeProtocol()
        .accounts({
          admin: publicKey,
        })
        .rpc();

      alert('Protocol initialized successfully!');
      fetchProtocolConfig();
    } catch (err: any) {
      console.error('Error initializing:', err);
      alert('Error: ' + (err.message || 'Failed to initialize'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollateral = async () => {
    if (!publicKey || !program || !collateralMint || !collateralPriceFeed) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(collateralMint);

      await program.methods
        .addSupportedCollateral(
          mintPubkey,
          new BN(parseFloat(ltv) * 10000),
          new BN(parseFloat(liquidationThreshold) * 10000),
          new BN(parseFloat(liquidationBonus) * 10000),
          new PublicKey(collateralPriceFeed)
        )
        .accounts({
          admin: publicKey,
        })
        .rpc();

      alert('Collateral added successfully!');
      setCollateralMint('');
      setCollateralPriceFeed('');
      fetchProtocolConfig();
    } catch (err: any) {
      console.error('Error adding collateral:', err);
      alert('Error: ' + (err.message || 'Failed to add collateral'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBorrow = async () => {
    if (!publicKey || !program || !borrowMint || !borrowPriceFeed) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(borrowMint);

      const annualRateFixed = new BN(parseFloat(interestRate) * 1e16);

      await program.methods
        .addSupportedBorrow(
          mintPubkey,
          annualRateFixed,
          new PublicKey(borrowPriceFeed)
        )
        .accounts({
          admin: publicKey,
        })
        .rpc();

      alert('Borrow asset added successfully!');
      setBorrowMint('');
      setBorrowPriceFeed('');
      fetchProtocolConfig();
    } catch (err: any) {
      console.error('Error adding borrow:', err);
      alert('Error: ' + (err.message || 'Failed to add borrow asset'));
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeVault = async () => {
    if (!publicKey || !program || !vaultMint) {
      alert('Please enter vault mint');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(vaultMint);
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), mintPubkey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializeVault()
        .accountsPartial({
          vault: vaultPda,
          mint: mintPubkey,
          admin: publicKey,
        })
        .rpc();

      alert('Vault initialized successfully!');
      setVaultMint('');
    } catch (err: any) {
      console.error('Error initializing vault:', err);
      alert('Error: ' + (err.message || 'Failed to initialize vault'));
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-secondary mb-4">Please connect your wallet to access admin panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-12">
        <h1 className="text-5xl font-light text-white mb-2">Admin Panel</h1>
        <p className="text-secondary">Manage protocol configuration and supported assets</p>
      </div>

      {/* Initialize Protocol */}
      {!protocolConfig && (
        <div className="bg-card border border-border rounded-lg p-8 mb-6">
          <h3 className="text-xl font-light text-white mb-4">Initialize Protocol</h3>
          <button
            onClick={handleInitialize}
            disabled={loading}
            className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted"
          >
            {loading ? 'Processing...' : 'Initialize Protocol'}
          </button>
        </div>
      )}

      {protocolConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Collateral */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-xl font-light text-white mb-6">Add Collateral Asset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-muted text-sm uppercase tracking-wider mb-2">Mint Address</label>
                <input
                  type="text"
                  value={collateralMint}
                  onChange={(e) => setCollateralMint(e.target.value)}
                  className="w-full bg-background border border-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
                  placeholder="Mint address"
                />
              </div>
              <div>
                <label className="block text-muted text-sm uppercase tracking-wider mb-2">Price Feed ID</label>
                <input
                  type="text"
                  value={collateralPriceFeed}
                  onChange={(e) => setCollateralPriceFeed(e.target.value)}
                  className="w-full bg-background border border-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
                  placeholder="Pyth price feed ID"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">LTV %</label>
                  <input
                    type="number"
                    value={ltv}
                    onChange={(e) => setLtv(e.target.value)}
                    className="w-full bg-background border border-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">Liq. Threshold %</label>
                  <input
                    type="number"
                    value={liquidationThreshold}
                    onChange={(e) => setLiquidationThreshold(e.target.value)}
                    className="w-full bg-background border border-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">Bonus %</label>
                  <input
                    type="number"
                    value={liquidationBonus}
                    onChange={(e) => setLiquidationBonus(e.target.value)}
                    className="w-full bg-background border border-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleAddCollateral}
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted"
              >
                {loading ? 'Processing...' : 'Add Collateral'}
              </button>
            </div>
          </div>

          {/* Add Borrow Asset */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-xl font-light text-white mb-6">Add Borrow Asset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-muted text-sm uppercase tracking-wider mb-2">Mint Address</label>
                <input
                  type="text"
                  value={borrowMint}
                  onChange={(e) => setBorrowMint(e.target.value)}
                  className="w-full bg-background border border-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
                  placeholder="Mint address"
                />
              </div>
              <div>
                <label className="block text-muted text-sm uppercase tracking-wider mb-2">Price Feed ID</label>
                <input
                  type="text"
                  value={borrowPriceFeed}
                  onChange={(e) => setBorrowPriceFeed(e.target.value)}
                  className="w-full bg-background border border-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
                  placeholder="Pyth price feed ID"
                />
              </div>
              <div>
                <label className="block text-muted text-sm uppercase tracking-wider mb-2">Annual Interest Rate %</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full bg-background border border-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary text-sm"
                  step="0.1"
                />
              </div>
              <button
                onClick={handleAddBorrow}
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted"
              >
                {loading ? 'Processing...' : 'Add Borrow Asset'}
              </button>
            </div>
          </div>

          {/* Initialize Vault */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-xl font-light text-white mb-6">Initialize Vault</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-muted text-sm uppercase tracking-wider mb-2">Vault Mint Address</label>
                <input
                  type="text"
                  value={vaultMint}
                  onChange={(e) => setVaultMint(e.target.value)}
                  className="w-full bg-background border border-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
                  placeholder="Mint address"
                />
              </div>
              <button
                onClick={handleInitializeVault}
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted"
              >
                {loading ? 'Processing...' : 'Initialize Vault'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
