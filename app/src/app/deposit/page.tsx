'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

export default function DepositPage() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [selectedMint, setSelectedMint] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

  const handleDeposit = async () => {
    if (!publicKey || !program || !amount || !selectedMint) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(selectedMint);
      const amountLamports = new BN(Math.floor(parseFloat(amount) * 1e9));

      const userTokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey);
      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        alert('Error: You do not have a token account for this asset.');
        return;
      }

      const [debtAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('debt'), publicKey.toBuffer()],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), mintPubkey.toBuffer()],
        program.programId
      );

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      const config = await program.account.protocolConfig.fetch(configPda);
      const collateralInfo = config.supportedCollaterals.find(
        (c: any) => c.mint.toString() === mintPubkey.toString()
      );

      if (!collateralInfo) {
        alert('This asset is not supported as collateral');
        return;
      }

      await program.methods
        .depositCollateral(amountLamports)
        .accountsPartial({
          debtAccount: debtAccountPda,
          owner: publicKey,
          userCollateral: userTokenAccount,
          vault: vaultPda,
          collateralMint: mintPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          config: configPda,
          priceFeed: collateralInfo.priceFeed,
        })
        .rpc();

      alert('Deposit successful!');
      setAmount('');
    } catch (err) {
      console.error('Error depositing:', err);
      alert('Deposit failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !program || !amount || !selectedMint) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const mintPubkey = new PublicKey(selectedMint);
      const amountLamports = new BN(Math.floor(parseFloat(amount) * 1e9));

      const [debtAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('debt'), publicKey.toBuffer()],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), mintPubkey.toBuffer()],
        program.programId
      );

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      const config = await program.account.protocolConfig.fetch(configPda);
      const collateralInfo = config.supportedCollaterals.find(
        (c: any) => c.mint.toString() === mintPubkey.toString()
      );

      if (!collateralInfo) {
        alert('This asset is not supported as collateral');
        return;
      }

      const userTokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey);
      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        alert('Error: You do not have a token account for this asset.');
        return;
      }

      await program.methods
        .withdrawCollateral(amountLamports)
        .accountsPartial({
          debtAccount: debtAccountPda,
          owner: publicKey,
          userCollateral: userTokenAccount,
          vault: vaultPda,
          collateralMint: mintPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          config: configPda,
          priceFeed: collateralInfo.priceFeed,
        })
        .rpc();

      alert('Withdrawal successful!');
      setAmount('');
    } catch (err) {
      console.error('Error withdrawing:', err);
      alert('Withdrawal failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-secondary mb-4">Please connect your wallet to manage collateral</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-12">
        <h1 className="text-5xl font-light text-white mb-2">Manage Collateral</h1>
        <p className="text-secondary">Deposit or withdraw your collateral assets</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-8">
        {/* Mode Toggle */}
        <div className="flex space-x-2 mb-8 bg-background p-1 rounded-lg border border-border">
          <button
            onClick={() => setMode('deposit')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'deposit'
                ? 'bg-primary text-white'
                : 'text-secondary hover:text-white'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setMode('withdraw')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'withdraw'
                ? 'bg-primary text-white'
                : 'text-secondary hover:text-white'
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-muted text-sm uppercase tracking-wider mb-2">
              Collateral Mint Address
            </label>
            <input
              type="text"
              placeholder="Enter mint address"
              value={selectedMint}
              onChange={(e) => setSelectedMint(e.target.value)}
              className="w-full bg-background border border-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-muted text-sm uppercase tracking-wider mb-2">
              Amount
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-background border border-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-lg"
              step="0.01"
              min="0"
            />
          </div>

          <button
            onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={loading || !amount || !selectedMint}
            className="w-full bg-primary text-white py-4 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : mode === 'deposit' ? 'Deposit Collateral' : 'Withdraw Collateral'}
          </button>
        </div>
      </div>
    </div>
  );
}
