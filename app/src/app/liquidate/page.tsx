'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';

interface UnhealthyPosition {
  owner: string;
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
      
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );
      const config = await program.account.protocolConfig.fetch(configPda);

      const unhealthy: UnhealthyPosition[] = [];

      for (const acc of accounts) {
        let totalCollateralValue = 0;
        let totalDebtValue = 0;

        for (const c of acc.account.collateralBalances) {
          const info = config.supportedCollaterals.find((sc: any) => 
            sc.mint.toString() === c.mint.toString()
          );
          if (info) {
            const price = info.price.toNumber() / 1e6;
            totalCollateralValue += (c.amount.toNumber() / 1e9) * price;
          }
        }

        for (const d of acc.account.debtBalances) {
          const info = config.supportedBorrows.find((sb: any) => 
            sb.mint.toString() === d.borrowMint.toString()
          );
          if (info) {
            const price = info.price.toNumber() / 1e6;
            const principal = d.principal.toNumber() / 1e9;
            const currentIndex = info.globalIndex.toNumber() / 1e18;
            const snapshotIndex = d.interestIndexSnapshot.toNumber() / 1e18;
            const owed = principal * (currentIndex / snapshotIndex);
            totalDebtValue += owed * price;
          }
        }

        let weightedThreshold = 0;
        if (totalCollateralValue > 0) {
          let numerator = 0;
          for (const c of acc.account.collateralBalances) {
            const info = config.supportedCollaterals.find((sc: any) => 
              sc.mint.toString() === c.mint.toString()
            );
            if (info) {
              const price = info.price.toNumber() / 1e6;
              const value = (c.amount.toNumber() / 1e9) * price;
              numerator += value * (info.liquidationThreshold.toNumber() / 10000);
            }
          }
          weightedThreshold = numerator / totalCollateralValue;
        }

        const healthRatio = totalDebtValue > 0 ? 
          (totalCollateralValue * weightedThreshold) / totalDebtValue : 999;

        if (healthRatio < 1 && totalDebtValue > 0) {
          unhealthy.push({
            owner: acc.account.owner.toString(),
            healthRatio,
            collateralValue: totalCollateralValue,
            debtValue: totalDebtValue,
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
    if (!publicKey || !program || !selectedPosition || !amount) {
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

      const collateralMint = new PublicKey('COLLATERAL_MINT');
      const borrowMint = new PublicKey('BORROW_MINT');

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), collateralMint.toBuffer()],
        program.programId
      );

      const liquidatorCollateralAccount = new PublicKey('YOUR_COLLATERAL_ACCOUNT');
      const liquidatorBorrowAccount = new PublicKey('YOUR_BORROW_ACCOUNT');

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
          collateralMint,
          borrowMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      alert('Liquidation successful!');
      fetchUnhealthyPositions();
      setAmount('');
      setSelectedPosition('');
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
        <div className="text-center p-8 glass-panel rounded-2xl">
          <p className="text-gray-400 mb-4">Please connect your wallet to view liquidations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-red-500">Liquidation</span> Dashboard
        </h1>
        <button
          onClick={fetchUnhealthyPositions}
          disabled={loading}
          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 font-semibold py-2 px-6 rounded-xl disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              Refreshing...
            </>
          ) : (
            <>
              <span>🔄</span> Refresh
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-gray-400 text-sm uppercase tracking-wider font-medium">Unhealthy Positions</p>
          <p className="text-white text-4xl font-bold mt-2 text-glow">{positions.length}</p>
        </div>
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-gray-400 text-sm uppercase tracking-wider font-medium">Total Liquidatable Debt</p>
          <p className="text-white text-4xl font-bold mt-2 text-glow">
            ${positions.reduce((sum, p) => sum + p.debtValue, 0).toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-6 rounded-2xl border-green-500/20">
          <p className="text-gray-400 text-sm uppercase tracking-wider font-medium">Liquidation Bonus</p>
          <p className="text-green-400 text-4xl font-bold mt-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">~5-10%</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white">Unhealthy Positions</h2>
        </div>

        {loading && (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            Scanning blockchain for risky positions...
          </div>
        )}

        {!loading && positions.length === 0 && (
          <div className="p-16 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl text-white font-medium mb-2">Protocol is Healthy</h3>
            <p className="text-gray-400">No unhealthy positions found. All borrowers are safe!</p>
          </div>
        )}

        {!loading && positions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Health Ratio</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Collateral</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Debt</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {positions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {pos.owner.slice(0, 8)}...{pos.owner.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded-md border border-red-400/20">
                        {pos.healthRatio.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      ${pos.collateralValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      ${pos.debtValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedPosition(pos.owner)}
                        className="text-red-400 hover:text-red-300 font-semibold bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-lg transition-all duration-300 border border-red-400/20 hover:border-red-400/50"
                      >
                        Liquidate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPosition && (
        <div className="mt-8 glass-panel p-8 rounded-2xl border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)] animate-slide-up">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Liquidate Position
          </h3>
          <div className="bg-black/20 p-4 rounded-xl mb-6 border border-white/5">
            <p className="text-gray-400 text-sm mb-1">Target Account</p>
            <p className="text-white font-mono">{selectedPosition}</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-400 mb-2 text-sm font-medium uppercase tracking-wider">Debt Amount to Repay</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 text-white px-4 py-4 rounded-xl focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-mono text-lg"
                  step="0.01"
                  min="0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  TOKEN
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-3">
              <span className="text-lg">💰</span>
              <p className="text-green-400 text-sm leading-relaxed">
                You'll receive collateral worth <strong>more</strong> than the debt you repay (including liquidation bonus).
              </p>
            </div>

            <button
              onClick={handleLiquidate}
              disabled={loading || !amount}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-6 rounded-xl disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-600/40 transform hover:-translate-y-1"
            >
              {loading ? 'Processing...' : 'Execute Liquidation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
