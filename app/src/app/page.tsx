'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import HealthRatio from '@/components/HealthRatio';
import StatCard from '@/components/StatCard';
import AssetRow from '@/components/AssetRow';

interface UserPosition {
  collateralValue: number;
  debtValue: number;
  healthRatio: number;
  collaterals: Array<{
    mint: string;
    symbol: string;
    amount: number;
    valueUSD: number;
  }>;
  debts: Array<{
    mint: string;
    symbol: string;
    amount: number;
    valueUSD: number;
    apy: number;
  }>;
}

export default function Home() {
  const { publicKey } = useWallet();
  const { program } = useAnchor();
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    if (publicKey && program) {
      fetchUserPosition();
    }
  }, [publicKey, program]);

  const fetchUserPosition = async () => {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      const [debtAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('debt'), publicKey.toBuffer()],
        program.programId
      );

      const debtAccount = await program.account.userDebtAccount.fetch(debtAccountPda);
      setHasAccount(true);

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );
      const config = await program.account.protocolConfig.fetch(configPda);

      let totalCollateralValue = 0;
      const collaterals = debtAccount.collateralBalances.map((c: any) => {
        const info = config.supportedCollaterals.find((sc: any) => 
          sc.mint.toString() === c.mint.toString()
        );
        const price = info ? info.price.toNumber() / 1e6 : 0;
        const valueUSD = (c.amount.toNumber() / 1e9) * price;
        totalCollateralValue += valueUSD;
        
        return {
          mint: c.mint.toString(),
          symbol: 'COL',
          amount: c.amount.toNumber() / 1e9,
          valueUSD,
        };
      });

      let totalDebtValue = 0;
      const debts = debtAccount.debtBalances.map((d: any) => {
        const info = config.supportedBorrows.find((sb: any) => 
          sb.mint.toString() === d.borrowMint.toString()
        );
        const price = info ? info.price.toNumber() / 1e6 : 0;
        const annualRate = info ? info.annualRateFixed.toNumber() / 1e18 : 0;
        const apy = annualRate * 100;
        
        const principal = d.principal.toNumber() / 1e9;
        const currentIndex = info ? info.globalIndex.toNumber() / 1e18 : 1;
        const snapshotIndex = d.interestIndexSnapshot.toNumber() / 1e18;
        const owed = principal * (currentIndex / snapshotIndex);
        
        const valueUSD = owed * price;
        totalDebtValue += valueUSD;
        
        return {
          mint: d.borrowMint.toString(),
          symbol: 'DEBT',
          amount: owed,
          valueUSD,
          apy,
        };
      });

      const healthRatio = totalDebtValue > 0 ? totalCollateralValue / totalDebtValue : 999;

      setPosition({
        collateralValue: totalCollateralValue,
        debtValue: totalDebtValue,
        healthRatio,
        collaterals,
        debts,
      });
    } catch (err: any) {
      if (!err.message?.includes('Account does not exist')) {
        console.error('Error fetching position:', err);
      }
      setHasAccount(false);
    } finally {
      setLoading(false);
    }
  };

  const createDebtAccount = async () => {
    if (!publicKey || !program) return;

    try {
      const [debtAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('debt'), publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .openDebtAccount()
        .accountsPartial({
          debtAccount: debtAccountPda,
          owner: publicKey,
        })
        .rpc();

      alert('Debt account created successfully!');
      fetchUserPosition();
    } catch (err) {
      console.error('Error creating debt account:', err);
      alert('Failed to create debt account');
    }
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to Debt Manager
          </h2>
          <p className="text-gray-400 mb-8">
            Connect your wallet to get started
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!hasAccount) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Create Your Debt Account
          </h2>
          <p className="text-gray-400 mb-8">
            You need to create a debt account to start using the protocol
          </p>
          <button
            onClick={createDebtAccount}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Collateral"
          value={`$${position?.collateralValue.toFixed(2) || '0.00'}`}
          icon="🏦"
        />
        <StatCard
          title="Total Debt"
          value={`$${position?.debtValue.toFixed(2) || '0.00'}`}
          icon="💳"
        />
        <StatCard
          title="Available to Borrow"
          value={`$${((position?.collateralValue || 0) * 0.75 - (position?.debtValue || 0)).toFixed(2)}`}
          subtitle="At 75% LTV"
          icon="💰"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthRatio ratio={position?.healthRatio || 0} />
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/deposit"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
            >
              Deposit
            </a>
            <a
              href="/borrow"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
            >
              Borrow
            </a>
            <a
              href="/deposit"
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
            >
              Withdraw
            </a>
            <a
              href="/borrow"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
            >
              Repay
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Your Collateral</h3>
          <div className="space-y-3">
            {position?.collaterals && position.collaterals.length > 0 ? (
              position.collaterals.map((c, i) => (
                <AssetRow
                  key={i}
                  mint={c.mint}
                  symbol={c.symbol}
                  balance={c.amount}
                  valueUSD={c.valueUSD}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No collateral deposited</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Your Debt</h3>
          <div className="space-y-3">
            {position?.debts && position.debts.length > 0 ? (
              position.debts.map((d, i) => (
                <AssetRow
                  key={i}
                  mint={d.mint}
                  symbol={d.symbol}
                  balance={d.amount}
                  valueUSD={d.valueUSD}
                  apy={d.apy}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No debt borrowed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
