'use client';

import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { createContext, useContext, useMemo } from 'react';
import { DebtManager } from '../../../target/types/debt_manager';
import idl from '../../../target/idl/debt_manager.json';

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
);

interface AnchorContextType {
  program: Program<DebtManager> | null;
  provider: AnchorProvider | null;
}

const AnchorContext = createContext<AnchorContextType>({
  program: null,
  provider: null,
});

export function AnchorContextProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const value = useMemo(() => {
    if (!wallet) {
      return { program: null, provider: null };
    }

    try {
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: 'processed',
      });

      const program = new Program<DebtManager>(idl as DebtManager, provider);

      return { program, provider };
    } catch (error) {
      console.error('Error initializing Anchor program:', error);
      return { program: null, provider: null };
    }
  }, [connection, wallet]);

  return <AnchorContext.Provider value={value}>{children}</AnchorContext.Provider>;
}

export function useAnchor() {
  return useContext(AnchorContext);
}
