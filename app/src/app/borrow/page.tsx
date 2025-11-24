'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

export default function BorrowPage() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [selectedMint, setSelectedMint] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'borrow' | 'repay'>('borrow');

  const handleBorrow = async () => {
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
        alert('Error: You do not have a token account for this asset. Please create an Associated Token Account (ATA) for this mint in your wallet first (e.g., by receiving a small amount of this token).');
        return;
      }

      await program.methods
        .borrow(amountLamports)
        .accountsPartial({
          debtAccount: debtAccountPda,
          owner: publicKey,
          config: configPda,
          userTokenAccount: userTokenAccount,
          borrowMint: mintPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      alert('✅ Borrow successful!');
      setAmount('');
    } catch (err: any) {
      console.error('Error borrowing:', err);
      
      if (err.message?.includes('AccountNotInitialized') || err.message?.includes('user_token_account')) {
        alert('❌ You need to create a token account for this asset first.\n\nPlease create an Associated Token Account (ATA) for this mint address in your wallet, or use a service like Solflare/Phantom to receive this token type first.');
      } else if (err.message?.includes('User rejected')) {
        alert('❌ Transaction was rejected');
      } else if (err.message?.includes('insufficient')) {
        alert('❌ Insufficient SOL for transaction fees');
      } else if (err.message?.includes('LTV') || err.message?.includes('collateral')) {
        alert('❌ Insufficient collateral. Please deposit more collateral or borrow less.');
      } else {
        alert('Borrow failed: ' + (err.message || err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async () => {
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
        alert('Error: You do not have a token account for this asset. Please ensure you hold this token in your wallet before repaying.');
        return;
      }

      await program.methods
        .repay(amountLamports)
        .accountsPartial({
          debtAccount: debtAccountPda,
          owner: publicKey,
          config: configPda,
          userTokenAccount: userTokenAccount,
          borrowMint: mintPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      alert('✅ Repay successful!');
      setAmount('');
    } catch (err: any) {
      console.error('Error repaying:', err);
      
      if (err.message?.includes('User rejected')) {
        alert('❌ Transaction was rejected');
      } else if (err.message?.includes('insufficient')) {
        alert('❌ Insufficient tokens to repay this amount');
      } else {
        alert('Repay failed: ' + (err.message || err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 glass-panel rounded-2xl">
          <p className="text-gray-400 mb-4">Please connect your wallet to manage debt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <span className="text-secondary">Manage</span> Debt
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Section */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-8 rounded-2xl border border-white/10">
            <div className="flex space-x-4 mb-8 bg-black/20 p-1 rounded-xl">
              <button
                onClick={() => setMode('borrow')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                  mode === 'borrow'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Borrow
              </button>
              <button
                onClick={() => setMode('repay')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                  mode === 'repay'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Repay
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 mb-2 text-sm font-medium uppercase tracking-wider">Asset Mint Address</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Borrow Asset Mint Address"
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

              {mode === 'borrow' && (
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-xl flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <p className="text-yellow-400/90 text-sm leading-relaxed">
                      Make sure you have enough collateral. Borrowing beyond your LTV limit will fail.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-xl flex items-start gap-3">
                    <span className="text-lg">ℹ️</span>
                    <p className="text-blue-400/90 text-sm leading-relaxed">
                      <strong>First time borrowing?</strong> You need to create a token account for this asset first. Use your wallet to receive a small amount of this token type.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={mode === 'borrow' ? handleBorrow : handleRepay}
                disabled={loading || !amount || !selectedMint}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 transform hover:-translate-y-1 shadow-lg ${
                  mode === 'borrow'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-blue-500/30 disabled:from-gray-700 disabled:to-gray-800'
                    : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:shadow-purple-500/30 disabled:from-gray-700 disabled:to-gray-800'
                } disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : mode === 'borrow' ? 'Borrow Assets' : 'Repay Debt'}
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
                <strong className="text-blue-400">Borrowing:</strong> You can borrow up to 75% of your collateral value. Interest accrues automatically.
              </p>
              <p>
                <strong className="text-purple-400">Repaying:</strong> Repay your debt to improve your health ratio and unlock your collateral.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-secondary/20">
             <h3 className="text-lg font-semibold text-white mb-4">Market Info</h3>
             <div className="space-y-3">
               <div className="flex justify-between">
                 <span className="text-gray-400">Borrow Rate</span>
                 <span className="text-white font-mono">5% APR</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Max LTV</span>
                 <span className="text-white font-mono">75%</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Liquidation Threshold</span>
                 <span className="text-white font-mono">80%</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
