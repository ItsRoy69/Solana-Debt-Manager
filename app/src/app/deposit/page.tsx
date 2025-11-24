'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey, SystemProgram } from '@solana/web3.js';
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

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPubkey,
        publicKey
      );

      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        alert('Error: You do not have a token account for this asset. Please ensure you hold this token in your wallet before depositing.');
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

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintPubkey,
        publicKey
      );

      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        alert('Error: You do not have a token account for this asset. Please ensure you hold this token in your wallet before withdrawing.');
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
        <div className="text-center p-8 glass-panel rounded-2xl">
          <p className="text-gray-400 mb-4">Please connect your wallet to manage collateral</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <span className="text-primary">Manage</span> Collateral
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Section */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-8 rounded-2xl border border-white/10">
            <div className="flex space-x-4 mb-8 bg-black/20 p-1 rounded-xl">
              <button
                onClick={() => setMode('deposit')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                  mode === 'deposit'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setMode('withdraw')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                  mode === 'withdraw'
                    ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Withdraw
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium uppercase tracking-wider">Asset Mint Address</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter Token Mint Address"
                    value={selectedMint}
                    onChange={(e) => setSelectedMint(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 text-white px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    🔍
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium uppercase tracking-wider">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 text-white px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-lg"
                    step="0.01"
                    min="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    TOKEN
                  </div>
                </div>
              </div>

              <button
                onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={loading || !amount || !selectedMint}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 transform hover:-translate-y-1 shadow-lg ${
                  mode === 'deposit'
                    ? 'bg-gradient-to-r from-primary to-primary-600 hover:shadow-primary/30 disabled:from-gray-700 disabled:to-gray-800'
                    : 'bg-gradient-to-r from-secondary to-secondary-600 hover:shadow-secondary/30 disabled:from-gray-700 disabled:to-gray-800'
                } disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : mode === 'deposit' ? 'Deposit Collateral' : 'Withdraw Collateral'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">💡</span> Tips
            </h3>
            <div className="space-y-4 text-sm text-gray-400">
              <p>
                <strong className="text-primary">Depositing:</strong> Adding collateral increases your borrowing power and improves your health ratio.
              </p>
              <p>
                <strong className="text-secondary">Withdrawing:</strong> Removing collateral reduces your borrowing power. Ensure your health ratio remains safe to avoid liquidation.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-primary/20">
             <h3 className="text-lg font-semibold text-white mb-4">Market Info</h3>
             <div className="space-y-3">
               <div className="flex justify-between">
                 <span className="text-gray-400">Max LTV</span>
                 <span className="text-white font-mono">75%</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Liquidation Threshold</span>
                 <span className="text-white font-mono">80%</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Deposit Fee</span>
                 <span className="text-green-400 font-mono">0%</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
