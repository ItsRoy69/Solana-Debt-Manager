'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

interface UnhealthyPosition {
  user: string;
  healthRatio: number;
  collateralValue: number;
  debtValue: number;
}

export default function LiquidatePage() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
  const [positions, setPositions] = useState<UnhealthyPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [collateralMint, setCollateralMint] = useState('');
  const [borrowMint, setBorrowMint] = useState('');

  useEffect(() => {
    if (program) {
      fetchUnhealthyPositions();
    }
  }, [program]);

  const fetchUnhealthyPositions = async () => {
    if (!program) return;

    setLoading(true);
    try {
      const accounts = await program.account.userDebtAccount.all();
      
      const unhealthy: UnhealthyPosition[] = [];
      for (const account of accounts) {
        const data = account.account;
        
        const totalCollateral = data.collateralBalances.reduce((sum: number, c: any) => {
          return sum + c.amount.toNumber() / 1e9;
        }, 0);

        const totalDebt = data.debtBalances.reduce((sum: number, d: any) => {
          return sum + d.principal.toNumber() / 1e9;
        }, 0);

        const healthRatio = totalDebt > 0 ? totalCollateral / totalDebt : 999;

        if (healthRatio < 1.2 && totalDebt > 0) {
          unhealthy.push({
            user: data.owner.toString(),
            healthRatio,
            collateralValue: totalCollateral,
            debtValue: totalDebt,
          });
        }
      }

      setPositions(unhealthy);
    } catch (err) {
      console.error('Error fetching positions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidate = async () => {
    if (!publicKey || !program || !selectedPosition || !amount || !collateralMint || !borrowMint) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const userPubkey = new PublicKey(selectedPosition);
      const amountLamports = new BN(Math.floor(parseFloat(amount) * 1e9));

      const [debtAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('debt'), userPubkey.toBuffer()],
        program.programId
      );

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );

      const collateralMintPubkey = new PublicKey(collateralMint);
      const borrowMintPubkey = new PublicKey(borrowMint);

      const config = await program.account.protocolConfig.fetch(configPda);
      
      const collateralInfo = config.supportedCollaterals.find(
        (c: any) => c.mint.toString() === collateralMintPubkey.toString()
      );
      const borrowInfo = config.supportedBorrows.find(
        (b: any) => b.mint.toString() === borrowMintPubkey.toString()
      );

      if (!collateralInfo || !borrowInfo) {
        alert('Collateral or borrow asset not supported');
        return;
      }

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), collateralMintPubkey.toBuffer()],
        program.programId
      );

      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
      const liquidatorCollateralAccount = getAssociatedTokenAddressSync(collateralMintPubkey, publicKey);
      const liquidatorBorrowAccount = getAssociatedTokenAddressSync(borrowMintPubkey, publicKey);

      await program.methods
        .liquidate(amountLamports)
        .accountsPartial({
          debtAccount: debtAccountPda,
          user: userPubkey,
          liquidator: publicKey,
          liquidatorCollateralAccount,
          liquidatorBorrowAccount,
          config: configPda,
          vault: vaultPda,
          collateralMint: collateralMintPubkey,
          borrowMint: borrowMintPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          collateralPriceFeed: collateralInfo.priceFeed,
          borrowPriceFeed: borrowInfo.priceFeed,
        })
        .rpc();

      alert('Liquidation successful!');
      setAmount('');
      setSelectedPosition('');
      fetchUnhealthyPositions();
    } catch (err) {
      console.error('Error liquidating:', err);
      alert('Liquidation failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-secondary mb-4">Please connect your wallet to liquidate positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-12">
        <h1 className="text-5xl font-light text-white mb-2">Liquidations</h1>
        <p className="text-secondary">Liquidate unhealthy positions and earn rewards</p>
      </div>

      {/* Unhealthy Positions */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-xl font-light text-white mb-6">Unhealthy Positions</h3>
        
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary">Loading positions...</p>
          </div>
        )}

        {!loading && positions.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted">No unhealthy positions found</p>
          </div>
        )}

        {!loading && positions.length > 0 && (
          <div className="space-y-3">
            {positions.map((pos, i) => (
              <div
                key={i}
                onClick={() => setSelectedPosition(pos.user)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedPosition === pos.user
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-border-light bg-background'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-mono text-sm">{pos.user.slice(0, 8)}...{pos.user.slice(-8)}</p>
                    <p className="text-muted text-xs mt-1">Health: {pos.healthRatio.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{pos.collateralValue.toFixed(4)} Collateral</p>
                    <p className="text-muted text-sm">{pos.debtValue.toFixed(4)} Debt</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liquidation Form */}
      {selectedPosition && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-xl font-light text-white mb-6">Execute Liquidation</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-muted text-sm uppercase tracking-wider mb-2">Collateral Mint</label>
              <input
                type="text"
                placeholder="Collateral mint address"
                value={collateralMint}
                onChange={(e) => setCollateralMint(e.target.value)}
                className="w-full bg-background border border-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-muted text-sm uppercase tracking-wider mb-2">Borrow Mint</label>
              <input
                type="text"
                placeholder="Borrow mint address"
                value={borrowMint}
                onChange={(e) => setBorrowMint(e.target.value)}
                className="w-full bg-background border border-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-muted text-sm uppercase tracking-wider mb-2">Debt Amount to Repay</label>
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
              onClick={handleLiquidate}
              disabled={loading || !amount || !collateralMint || !borrowMint}
              className="w-full bg-primary text-white py-4 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Execute Liquidation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
