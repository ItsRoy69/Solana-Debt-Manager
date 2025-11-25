'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchor } from '@/contexts/AnchorContextProvider';
import { PublicKey } from '@solana/web3.js';
import { parsePriceData } from '@pythnetwork/client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

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

  const { connection } = useConnection();

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


      const priceFeedKeys: PublicKey[] = [];
      const mintToPriceFeed: Record<string, PublicKey> = {};

      config.supportedCollaterals.forEach((c: any) => {
        priceFeedKeys.push(c.priceFeed);
        mintToPriceFeed[c.mint.toString()] = c.priceFeed;
      });
      config.supportedBorrows.forEach((b: any) => {
        priceFeedKeys.push(b.priceFeed);
        mintToPriceFeed[b.mint.toString()] = b.priceFeed;
      });

      const priceInfos = await connection.getMultipleAccountsInfo(priceFeedKeys);
      const priceMap: Record<string, number> = {};

      priceInfos.forEach((info, i) => {
        if (info) {
          try {
            const priceData = parsePriceData(info.data);
            if (priceData && priceData.price) {
              priceMap[priceFeedKeys[i].toString()] = priceData.price;
            }
          } catch (e) {
            console.error('Error parsing price data', e);
          }
        }
      });

      let totalCollateralValue = 0;
      const collaterals = debtAccount.collateralBalances.map((c: any) => {
        const mintStr = c.mint.toString();
        const priceFeed = mintToPriceFeed[mintStr];
        const price = priceFeed ? (priceMap[priceFeed.toString()] || 0) : 0;
        
        const amount = c.amount.toNumber() / 1e9;
        const valueUSD = amount * price;
        totalCollateralValue += valueUSD;
        
        return {
          mint: mintStr,
          symbol: 'COL',
          amount,
          valueUSD,
        };
      });

      let totalDebtValue = 0;
      const debts = debtAccount.debtBalances.map((d: any) => {
        const mintStr = d.borrowMint.toString();
        const info = config.supportedBorrows.find((sb: any) => 
          sb.mint.toString() === mintStr
        );
        
        const priceFeed = mintToPriceFeed[mintStr];
        const price = priceFeed ? (priceMap[priceFeed.toString()] || 0) : 0;
        
        const annualRate = info ? info.annualRateFixed.toNumber() / 1e18 : 0;
        const apy = annualRate * 100;
        
        const principal = d.principal.toNumber() / 1e9;
        const currentIndex = info ? info.globalIndex.toNumber() / 1e18 : 1;
        const snapshotIndex = d.interestIndexSnapshot.toNumber() / 1e18;
        

        const indexRatio = snapshotIndex > 0 ? currentIndex / snapshotIndex : 1;
        const owed = principal * indexRatio;
        
        const valueUSD = owed * price;
        totalDebtValue += valueUSD;
        
        return {
          mint: mintStr,
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

      alert('Account created successfully');
      fetchUserPosition();
    } catch (err) {
      console.error('Error creating account:', err);
      alert('Failed to create account');
    }
  };

  if (!publicKey) {
    return (
      <>
        <div className="fixed inset-0 z-0">
          <Image
            src="/bg.avif"
            alt="Background"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background/80" />
        </div>
        
        <div className="flex items-center justify-center min-h-[80vh] relative z-10">
          <div className="text-center max-w-2xl animate-fade-in">
            <h1 className="text-6xl font-light text-white mb-6">
              Solana Debt Manager
            </h1>
            <p className="text-secondary text-lg mb-8">
              Decentralized lending protocol with real-time oracle integration
            </p>
            <div className="inline-block px-6 py-3 border border-border rounded-lg text-secondary text-sm">
              Connect your wallet to get started
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Loading your position...</p>
        </div>
      </div>
    );
  }

  if (!hasAccount) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-xl animate-fade-in">
          <h2 className="text-4xl font-light text-white mb-4">
            Initialize Your Account
          </h2>
          <p className="text-secondary mb-8">
            Create your debt account to start depositing collateral and borrowing assets
          </p>
          <button
            onClick={createDebtAccount}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:shadow-glow transition-all duration-300"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-light text-white mb-2">Dashboard</h1>
        <p className="text-secondary">Manage your positions and monitor your health ratio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-card border border-border rounded-lg p-6 hover:border-border-light transition-all">
          <p className="text-muted text-sm uppercase tracking-wider mb-2">Total Collateral</p>
          <p className="text-3xl font-light text-white">{position?.collaterals.reduce((sum, c) => sum + c.amount, 0).toFixed(4)}</p>
          <p className="text-secondary text-sm mt-1">Tokens</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:border-border-light transition-all">
          <p className="text-muted text-sm uppercase tracking-wider mb-2">Total Debt</p>
          <p className="text-3xl font-light text-white">{position?.debts.reduce((sum, d) => sum + d.amount, 0).toFixed(4)}</p>
          <p className="text-secondary text-sm mt-1">Tokens</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:border-border-light transition-all">
          <p className="text-muted text-sm uppercase tracking-wider mb-2">Health Ratio</p>
          <p className="text-3xl font-light text-primary">{position?.healthRatio.toFixed(2)}</p>
          <p className="text-secondary text-sm mt-1">Safe</p>
        </div>
      </div>

      {/* Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collateral */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-xl font-light text-white mb-6">Your Collateral</h3>
          <div className="space-y-3">
            {position?.collaterals && position.collaterals.length > 0 ? (
              position.collaterals.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-background rounded-lg border border-border hover:border-border-light transition-all">
                  <div>
                    <p className="text-white font-medium">{c.symbol}</p>
                    <p className="text-muted text-sm font-mono">{c.mint.slice(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{c.amount.toFixed(4)}</p>
                    <p className="text-muted text-sm">Tokens</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-muted mb-2">No collateral deposited</p>
                <a href="/deposit" className="text-primary text-sm hover:underline">Deposit now →</a>
              </div>
            )}
          </div>
        </div>

        {/* Debt */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-xl font-light text-white mb-6">Your Debt</h3>
          <div className="space-y-3">
            {position?.debts && position.debts.length > 0 ? (
              position.debts.map((d, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-background rounded-lg border border-border hover:border-border-light transition-all">
                  <div>
                    <p className="text-white font-medium">{d.symbol}</p>
                    <p className="text-muted text-sm">{d.apy.toFixed(2)}% APY</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{d.amount.toFixed(4)}</p>
                    <p className="text-muted text-sm">Tokens</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-muted mb-2">No active loans</p>
                <a href="/borrow" className="text-primary text-sm hover:underline">Borrow assets →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <a href="/deposit" className="p-6 bg-card border border-border rounded-lg hover:border-primary hover:shadow-glow transition-all text-center group">
          <div className="text-3xl mb-2">📥</div>
          <p className="text-white font-medium">Deposit</p>
        </a>
        <a href="/borrow" className="p-6 bg-card border border-border rounded-lg hover:border-primary hover:shadow-glow transition-all text-center group">
          <div className="text-3xl mb-2">💸</div>
          <p className="text-white font-medium">Borrow</p>
        </a>
        <a href="/deposit" className="p-6 bg-card border border-border rounded-lg hover:border-primary hover:shadow-glow transition-all text-center group">
          <div className="text-3xl mb-2">📤</div>
          <p className="text-white font-medium">Withdraw</p>
        </a>
        <a href="/borrow" className="p-6 bg-card border border-border rounded-lg hover:border-primary hover:shadow-glow transition-all text-center group">
          <div className="text-3xl mb-2">💳</div>
          <p className="text-white font-medium">Repay</p>
        </a>
      </div>
    </div>
  );
}
