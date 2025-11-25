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
      
      const config = await program.account.protocolConfig.fetch(configPda);
      const borrowInfo = config.supportedBorrows.find(
        (b: any) => b.mint.toString() === mintPubkey.toString()
      );

      if (!borrowInfo) {
        alert('This asset is not supported for borrowing');
        return;
      }

      const userTokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey);
      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        alert('Error: You do not have a token account for this asset.');
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
          priceFeed: borrowInfo.priceFeed,
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

      const config = await program.account.protocolConfig.fetch(configPda);
      const borrowInfo = config.supportedBorrows.find(
        (b: any) => b.mint.toString() === mintPubkey.toString()
      );

      if (!borrowInfo) {
        alert('This asset is not supported for borrowing');
        return;
      }

      const userTokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey);
      const accountInfo = await connection.getAccountInfo(userTokenAccount);
      if (!accountInfo) {
        alert('Error: You do not have a token account for this asset.');
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
          priceFeed: borrowInfo.priceFeed,
        })
        .rpc();

      alert('Repayment successful!');
      setAmount('');
    } catch (err) {
      console.error('Error repaying:', err);
      alert('Repayment failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-secondary mb-4">Please connect your wallet to borrow assets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-12">
        <h1 className="text-5xl font-light text-white mb-2">Borrow & Repay</h1>
        <p className="text-secondary">Borrow assets against your collateral or repay your debt</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-8">
        {/* Mode Toggle */}
        <div className="flex space-x-2 mb-8 bg-background p-1 rounded-lg border border-border">
          <button
            onClick={() => setMode('borrow')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'borrow'
                ? 'bg-primary text-white'
                : 'text-secondary hover:text-white'
            }`}
          >
            Borrow
          </button>
          <button
            onClick={() => setMode('repay')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'repay'
                ? 'bg-primary text-white'
                : 'text-secondary hover:text-white'
            }`}
          >
            Repay
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-muted text-sm uppercase tracking-wider mb-2">
              Borrow Asset Mint Address
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
            onClick={mode === 'borrow' ? handleBorrow : handleRepay}
            disabled={loading || !amount || !selectedMint}
            className="w-full bg-primary text-white py-4 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : mode === 'borrow' ? 'Borrow Assets' : 'Repay Debt'}
          </button>
        </div>
      </div>
    </div>
  );
}
