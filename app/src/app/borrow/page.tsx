'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

export default function BorrowPage() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
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

      alert('Borrow successful!');
      setAmount('');
    } catch (err) {
      console.error('Error borrowing:', err);
      alert('Borrow failed: ' + err);
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

      alert('Repay successful!');
      setAmount('');
    } catch (err) {
      console.error('Error repaying:', err);
      alert('Repay failed: ' + err);
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Manage Debt</h1>

      <div className="bg-gray-800 p-8 rounded-lg">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setMode('borrow')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              mode === 'borrow'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Borrow
          </button>
          <button
            onClick={() => setMode('repay')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              mode === 'repay'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Repay
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-400 mb-2">Asset</label>
            <input
              type="text"
              placeholder="Borrow Asset Mint Address"
              value={selectedMint}
              onChange={(e) => setSelectedMint(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Amount</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              step="0.01"
              min="0"
            />
          </div>

          {mode === 'borrow' && (
            <div className="p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ Make sure you have enough collateral. Borrowing beyond your LTV limit will fail.
              </p>
            </div>
          )}

          <button
            onClick={mode === 'borrow' ? handleBorrow : handleRepay}
            disabled={loading || !amount || !selectedMint}
            className={`w-full py-4 px-6 rounded-lg font-bold text-white transition-colors ${
              mode === 'borrow'
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
                : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600'
            } disabled:cursor-not-allowed`}
          >
            {loading ? 'Processing...' : mode === 'borrow' ? 'Borrow Assets' : 'Repay Debt'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-400 text-sm">
            💡 <strong>Interest Accrual:</strong> Interest is calculated using a global index model. 
            Your debt will increase over time based on the annual rate.
          </p>
        </div>
      </div>
    </div>
  );
}
