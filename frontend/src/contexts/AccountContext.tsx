
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
const baseUrl = import.meta.env.VITE_API_BASE_URL as string;


export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface AccountContextType {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  addAccount: (account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Account | undefined>;
  updateAccount: (id: string, updates: Partial<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<Account | undefined>;
  deleteAccount: (id: string) => Promise<void>;
  refetchAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/accounts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const fetchedAccounts = data.accounts.map((acc: any) => ({
        ...acc,
        balance: Number(acc.balance),
      }));
      setAccounts(fetchedAccounts);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch accounts');
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (newAccountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account | undefined> => {
    try {
      const response = await fetch(`${baseUrl}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAccountData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAccounts(prevAccounts => [...prevAccounts, data.account]);
      return data.account;
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
      console.error('Error adding account:', err);
      return undefined;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Account | undefined> => {
    try {
      const response = await fetch(`${baseUrl}/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAccounts(prevAccounts =>
        prevAccounts.map(acc => (acc.id === id ? data.account : acc))
      );
      return data.account;
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
      console.error('Error updating account:', err);
      return undefined;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const response = await fetch(`${baseUrl}/accounts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== id));
      console.log(`Account ${id} deleted successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      console.error('Error deleting account:', err);
    }
  };

  const contextValue = {
    accounts,
    isLoading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    refetchAccounts: fetchAccounts, 
  };

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};