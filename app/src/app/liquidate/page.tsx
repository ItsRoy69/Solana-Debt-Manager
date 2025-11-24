'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

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
      const amountLamports = Math.floor(parseFloat(amount) * 1e9);

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
        .accounts({
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
        <p className="text-gray-400">Please connect your wallet</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Liquidation Dashboard</h1>
        <button
          onClick={fetchUnhealthyPositions}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-600"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-sm">Unhealthy Positions</p>
          <p className="text-white text-3xl font-bold mt-2">{positions.length}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-sm">Total Liquidatable Debt</p>
          <p className="text-white text-3xl font-bold mt-2">
            ${positions.reduce((sum, p) => sum + p.debtValue, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-sm">Liquidation Bonus</p>
          <p className="text-green-400 text-3xl font-bold mt-2">~5-10%</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Unhealthy Positions</h2>
        </div>

        {loading && (
          <div className="p-12 text-center text-gray-400">
            Loading positions...
          </div>
        )}

        {!loading && positions.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            No unhealthy positions found. All borrowers are healthy! 🎉
          </div>
        )}

        {!loading && positions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Health Ratio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Collateral Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Debt Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {positions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {pos.owner.slice(0, 8)}...{pos.owner.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-red-400 font-semibold">
                        {pos.healthRatio.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ${pos.collateralValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ${pos.debtValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedPosition(pos.owner)}
                        className="text-primary-400 hover:text-primary-300 font-semibold"
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
        <div className="mt-8 bg-gray-800 p-8 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">Liquidate Position</h3>
          <p className="text-gray-400 mb-4">
            Selected: {selectedPosition.slice(0, 12)}...{selectedPosition.slice(-12)}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2">Debt Amount to Repay</label>
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

            <div className="p-4 bg-green-900/30 border border-green-600 rounded-lg">
              <p className="text-green-400 text-sm">
                💰 You'll receive collateral worth more than the debt you repay (liquidation bonus)
              </p>
            </div>

            <button
              onClick={handleLiquidate}
              disabled={loading || !amount}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Execute Liquidation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
