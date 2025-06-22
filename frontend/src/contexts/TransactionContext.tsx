
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface Transaction {
  id: string;
  user_id: string; 
  account_id: string; 
  amount: number;
  type: 'income' | 'expense'; 
  description: string;
  category: string;
  transaction_date: string; 
  created_at: string;
  updated_at: string;
}

export interface TransactionPayload {
  account_id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  transaction_date: string;
}

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  addTransaction: (newTransactionData: TransactionPayload) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<TransactionPayload>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}transactions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      const data = await response.json();

      const fetchedTransactions: Transaction[] = data.transactions.map((tx: any) => ({
        ...tx,
        amount: parseFloat(tx.amount), 
      }));
      setTransactions(fetchedTransactions);
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);


  const addTransaction = async (transaction: TransactionPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error('Failed to add transaction');
      }

      const data = await response.json();

      const newTransaction = {
        ...data.transaction,
        amount: Number(data.transaction.amount),
      };
      setTransactions(prev => [newTransaction, ...prev]);

      return data;
    } catch (err) {
      console.error('Error adding transaction:', err);
      throw err;
    }
  };


  const updateTransaction = useCallback(async (id: string, updates: Partial<TransactionPayload>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update transaction: ${response.statusText}`);
      }
      await loadTransactions(); 
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setError(err.message || 'Failed to update transaction.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, loadTransactions]);


  const deleteTransaction = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete transaction: ${response.statusText}`);
      }
      await loadTransactions(); 
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      setError(err.message || 'Failed to delete transaction.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, loadTransactions]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const value = {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};