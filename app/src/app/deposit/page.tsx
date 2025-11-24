'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useState } from 'react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

export default function DepositPage() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
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
        <p className="text-gray-400">Please connect your wallet</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Manage Collateral</h1>

      <div className="bg-gray-800 p-8 rounded-lg">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setMode('deposit')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              mode === 'deposit'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setMode('withdraw')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              mode === 'withdraw'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Withdraw
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-400 mb-2">Asset</label>
            <input
              type="text"
              placeholder="Token Mint Address"
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

          <button
            onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={loading || !amount || !selectedMint}
            className={`w-full py-4 px-6 rounded-lg font-bold text-white transition-colors ${
              mode === 'deposit'
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600'
            } disabled:cursor-not-allowed`}
          >
            {loading ? 'Processing...' : mode === 'deposit' ? 'Deposit Collateral' : 'Withdraw Collateral'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-400 text-sm">
            💡 <strong>Note:</strong> Make sure you have the token in your wallet and have approved the program to transfer it.
          </p>
        </div>
      </div>
    </div>
  );
}
