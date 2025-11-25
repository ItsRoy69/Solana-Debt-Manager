'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';

interface Transaction {
  signature: string;
  slot: number;
  blockTime: number;
  status: 'success' | 'error';
  type: string;
}

export default function HistoryPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (publicKey && connection) {
      setAllTransactions([]);
      setCurrentPage(0);
      setHasMore(true);
      fetchHistory();
    }
  }, [publicKey, connection]);

  const fetchHistory = async (beforeSignature?: string) => {
    if (!publicKey || !connection) return;

    setLoading(true);
    try {
      const options: any = { limit: 10 };
      if (beforeSignature) {
        options.before = beforeSignature;
      }

      const signatures = await connection.getSignaturesForAddress(publicKey, options);
      
      if (signatures.length < 10) {
        setHasMore(false);
      }

      const formattedTxs: Transaction[] = signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime || 0,
        status: sig.err ? 'error' : 'success',
        type: 'Transaction' 
      }));

      setAllTransactions(prev => [...prev, ...formattedTxs]);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = async () => {
    const nextPageIndex = currentPage + 1;
    const neededItems = (nextPageIndex + 1) * ITEMS_PER_PAGE;
    
    if (allTransactions.length < neededItems && hasMore) {
      const lastTx = allTransactions[allTransactions.length - 1];
      await fetchHistory(lastTx?.signature);
    }
    
    setCurrentPage(nextPageIndex);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const currentTransactions = allTransactions.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-secondary mb-4">Please connect your wallet to view history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl font-light text-white mb-2">Transaction History</h1>
          <p className="text-secondary">View your past transactions and activity</p>
        </div>
        <button
          onClick={() => {
            setAllTransactions([]);
            setCurrentPage(0);
            setHasMore(true);
            fetchHistory();
          }}
          disabled={loading}
          className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-glow transition-all disabled:bg-border disabled:text-muted flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Refreshing...</span>
            </>
          ) : (
            <span>Refresh List</span>
          )}
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading && allTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Loading transactions...
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4 opacity-50">📜</div>
            <h3 className="text-xl text-white font-light mb-2">No History Found</h3>
            <p className="text-secondary">You haven't made any transactions yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase tracking-wider">Signature</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase tracking-wider">Slot</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentTransactions.map((tx) => (
                    <tr key={tx.signature} className="hover:bg-border/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary font-mono">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary font-mono">
                        {tx.slot}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {formatDate(tx.blockTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.status === 'success' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-blue hover:text-accent-blue-light transition-colors flex items-center gap-1"
                        >
                          View <span className="text-xs">↗</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-background/50">
              <div className="text-sm text-secondary">
                Showing {currentPage * ITEMS_PER_PAGE + 1} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, allTransactions.length)} of {hasMore ? 'many' : allTransactions.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0 || loading}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-card border border-border hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={(!hasMore && (currentPage + 1) * ITEMS_PER_PAGE >= allTransactions.length) || loading}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-card border border-border hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
