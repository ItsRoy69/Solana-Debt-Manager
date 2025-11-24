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
        const price = 0;
        const valueUSD = 0;
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
        const price = 0;
        const annualRate = info ? info.annualRateFixed.toNumber() / 1e18 : 0;
        const apy = annualRate * 100;
        
        const principal = d.principal.toNumber() / 1e9;
        const currentIndex = info ? info.globalIndex.toNumber() / 1e18 : 1;
        const snapshotIndex = d.interestIndexSnapshot.toNumber() / 1e18;
        const owed = principal * (currentIndex / snapshotIndex);
        
        const valueUSD = 0;
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
        <div className="text-center max-w-2xl mx-auto p-8 glass-panel rounded-3xl border border-primary/20 shadow-[0_0_50px_rgba(56,189,248,0.1)]">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="text-4xl">💎</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 text-glow">
            Welcome to Debt Manager
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            The premium platform for managing your Solana debt positions with ease and style.
            Connect your wallet to access the dashboard.
          </p>
          <div className="flex justify-center space-x-4">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-100"></div>
            <div className="h-2 w-2 rounded-full bg-secondary animate-bounce delay-200"></div>
            <div className="h-2 w-2 rounded-full bg-accent animate-bounce delay-300"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-primary text-xl font-medium animate-pulse">Loading Protocol Data...</div>
        </div>
      </div>
    );
  }

  if (!hasAccount) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-xl mx-auto p-8 glass-panel rounded-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Create Your Debt Account
          </h2>
          <p className="text-gray-400 mb-8">
            Initialize your account on the protocol to start depositing collateral and borrowing assets.
          </p>
          <button
            onClick={createDebtAccount}
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary-600 hover:to-secondary-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] transform hover:-translate-y-1"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Collateral"
          value={`$${position?.collateralValue.toFixed(2) || '0.00'}`}
          icon={<svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Total Debt"
          value={`$${position?.debtValue.toFixed(2) || '0.00'}`}
          icon={<svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
        />
        <StatCard
          title="Available to Borrow"
          value={`$${((position?.collateralValue || 0) * 0.75 - (position?.debtValue || 0)).toFixed(2)}`}
          subtitle="At 75% LTV"
          icon={<svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Collateral Section */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Your Collateral
              </h3>
              <button className="text-xs text-primary hover:text-white transition-colors">View All</button>
            </div>
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
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <p className="text-gray-500 mb-2">No collateral deposited</p>
                  <a href="/deposit" className="text-primary text-sm hover:underline">Deposit now →</a>
                </div>
              )}
            </div>
          </div>

          {/* Debt Section */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                Your Debt
              </h3>
              <button className="text-xs text-secondary hover:text-white transition-colors">View All</button>
            </div>
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
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <p className="text-gray-500 mb-2">No active loans</p>
                  <a href="/borrow" className="text-secondary text-sm hover:underline">Borrow assets →</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Content - 1/3 width */}
        <div className="space-y-6">
          <HealthRatio ratio={position?.healthRatio || 0} />
          
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <a href="/deposit" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 group">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📥</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Deposit</span>
              </a>
              <a href="/borrow" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-secondary/20 hover:border-secondary/50 transition-all duration-300 group">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">💸</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Borrow</span>
              </a>
              <a href="/deposit" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-accent/20 hover:border-accent/50 transition-all duration-300 group">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📤</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Withdraw</span>
              </a>
              <a href="/borrow" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-300 group">
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">💳</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">Repay</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
