
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTransactions, type Transaction, type TransactionPayload } from '../../contexts/TransactionContext';
import { useAccounts, type Account } from '../../contexts/AccountContext'; // Import the account context


export const DashboardPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { transactions, addTransaction, isLoading: transactionsLoading, error: transactionsError } = useTransactions();
  const { accounts, isLoading: accountsLoading, error: accountsError, refetchAccounts } = useAccounts(); 

  const [newTransactionType, setNewTransactionType] = useState<'income' | 'expense'>('expense');
  const [newTransactionAmount, setNewTransactionAmount] = useState<string>('');
  const [newTransactionDescription, setNewTransactionDescription] = useState<string>('');
  const [newTransactionCategory, setNewTransactionCategory] = useState<string>('');
  const [newTransactionDate, setNewTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTransactionAccountUsed, setNewTransactionAccountUsed] = useState<string>('');

  const formRef = useRef<HTMLFormElement>(null);
useEffect(() => {
    if (accounts.length > 0 && !newTransactionAccountUsed) {
      const sbiAccount = accounts.find(acc => acc.name === "SBI Savings bank account");
      const cashAccount = accounts.find(acc => acc.name === "Cash in hand");
      const stocksAccount = accounts.find(acc => acc.name === "Stocks Investments");

      if (sbiAccount) {
        setNewTransactionAccountUsed(sbiAccount.id);
      } else if (cashAccount) {
        setNewTransactionAccountUsed(cashAccount.id);
      } else if (stocksAccount) {
        setNewTransactionAccountUsed(stocksAccount.id);
      } else if (accounts.length > 0) {
        setNewTransactionAccountUsed(accounts[0].id);
      }
    }
  }, [accounts, newTransactionAccountUsed]);

  useEffect(() => {
    refetchAccounts();
  }, [refetchAccounts]);


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const calculateTotalNetWorth = (accounts: Account[]): number => {
    return accounts.reduce((acc, account) => acc + (typeof account.balance === 'number' ? account.balance : 0), 0);
  };

  const totalNetWorth = useMemo(() => calculateTotalNetWorth(accounts), [accounts]);

  const calculateNetFlowFromTransactions = (transactions: Transaction[]): number => {
    return transactions.reduce((acc, transaction) => {
      const amount = typeof transaction.amount === 'number' ? transaction.amount : 0;
      return acc + (transaction.type === 'income' ? amount : -amount);
    }, 0);
  };

  const netFlowFromTransactions = useMemo(() => calculateNetFlowFromTransactions(transactions), [transactions]);

  const getAccountCardClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
      case 'savings':
        return 'bg-blue-100 hover:bg-blue-200 border-blue-300';
      case 'cash':
        return 'bg-green-100 hover:bg-green-200 border-green-300';
      case 'credit card':
        return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300';
      case 'investment':
        return 'bg-purple-100 hover:bg-purple-200 border-purple-300';
      case 'loan':
        return 'bg-red-100 hover:bg-red-200 border-red-300';
      default:
        return 'bg-gray-100 hover:bg-gray-200 border-gray-300';
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case 'checking':
        case 'savings':
            return '🏦';
        case 'cash':
            return '💵';
        case 'credit card':
            return '💳';
        case 'investment':
            return '📈';
        case 'loan':
            return '💰';
        default:
            return '💳';
    }
  };


  const uniqueCategoriesForForm = useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach(transaction => {
      if (transaction.category) {
        categories.add(transaction.category);
      }
    });
    return Array.from(categories).sort();
  }, [transactions]);


  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(newTransactionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    if (!newTransactionDescription.trim()) {
      alert('Please enter a description.');
      return;
    }
    if (!newTransactionCategory.trim()) {
      alert('Please select or enter a category.');
      return;
    }
    if (!newTransactionAccountUsed) {
      alert('Please select an account.');
      return;
    }

    const transactionPayload: TransactionPayload = {
      transaction_date: newTransactionDate,
      description: newTransactionDescription.trim(),
      amount: amount,
      type: newTransactionType,
      category: newTransactionCategory.trim(),
      account_id: newTransactionAccountUsed,
    };

    try {
      await addTransaction(transactionPayload);
      await refetchAccounts(); 
      setNewTransactionAmount('');
      setNewTransactionDescription('');
      setNewTransactionCategory('');
      setNewTransactionType('expense');
      setNewTransactionDate(new Date().toISOString().split('T')[0]);
      if (formRef.current) {
        formRef.current.reset();
      }
    } catch (err) {
      console.error("Error adding transaction:", err);
    }
  };


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Welcome, Navneethram V K!</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors duration-200"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-indigo-600 text-white p-6 rounded-lg shadow-lg flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
          <p className="text-sm font-semibold opacity-80 mb-1">Total Net Worth</p>
          <p className="text-4xl font-extrabold">₹{totalNetWorth.toFixed(2)}</p>
          <p className="text-xs mt-2 opacity-70">(Sum of all accounts)</p>
        </div>

        <div className="bg-blue-500 text-white p-6 rounded-lg shadow-lg flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
          <p className="text-sm font-semibold opacity-80 mb-1">Net Flow from Transactions</p>
          <p className="text-4xl font-extrabold">₹{netFlowFromTransactions.toFixed(2)}</p>
          <p className="text-xs mt-2 opacity-70">(Income minus expenses from recorded transactions)</p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg shadow-md">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Your Accounts</h3>
        {accountsLoading && <p className="text-blue-600 text-center text-lg mb-4">Loading accounts...</p>}
        {accountsError && <p className="text-red-600 text-center text-lg mb-4">Error loading accounts: {accountsError}</p>}
        {accounts.length === 0 && !accountsLoading && !accountsError ? (
          <p className="text-gray-500 text-center italic">No accounts found. Please ensure your backend is running and accounts are seeded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => (
              <div key={account.id} className={`p-6 rounded-xl shadow-md border ${getAccountCardClass(account.type)}`}>
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">{getAccountIcon(account.type)}</span>
                  <p className="text-lg font-semibold text-gray-900">{account.name}</p>
                </div>
                <p className="text-xl font-bold text-gray-700">
                  Balance: {account.currency} {account.balance.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 capitalize">{account.type} Account</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg shadow-md">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New Transaction</h3>
        {transactionsLoading && <p className="text-blue-600 text-center text-lg mb-4">Adding transaction...</p>}
        {transactionsError && <p className="text-red-600 text-center text-lg mb-4">Error: {transactionsError}</p>}
        <form ref={formRef} onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="transactionType" className="block text-sm font-semibold text-gray-700 mb-2">Type:</label>
            <select
              id="transactionType"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200"
              value={newTransactionType}
              onChange={(e) => setNewTransactionType(e.target.value as 'income' | 'expense')}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div>
            <label htmlFor="transactionAmount" className="block text-sm font-semibold text-gray-700 mb-2">Amount ({accounts[0]?.currency || '₹'}):</label>
            <input
              type="number"
              id="transactionAmount"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200"
              placeholder="e.g., 500.00"
              value={newTransactionAmount}
              onChange={(e) => setNewTransactionAmount(e.target.value)}
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="transactionDescription" className="block text-sm font-semibold text-gray-700 mb-2">Description:</label>
            <input
              type="text"
              id="transactionDescription"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200"
              placeholder="e.g., Groceries, Freelance Payment"
              value={newTransactionDescription}
              onChange={(e) => setNewTransactionDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="accountUsed" className="block text-sm font-semibold text-gray-700 mb-2">Account Used:</label>
            <select
              id="accountUsed"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200"
              value={newTransactionAccountUsed}
              onChange={(e) => setNewTransactionAccountUsed(e.target.value)}
              required
            >
              {accounts.length > 0 ? (
                accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))
              ) : (
                <option value="" disabled>No accounts available</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="transactionCategory" className="block text-sm font-semibold text-gray-700 mb-2">Category:</label>
            <input
              list="categories"
              id="transactionCategory"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200"
              placeholder="e.g., Food, Work, Utilities"
              value={newTransactionCategory}
              onChange={(e) => setNewTransactionCategory(e.target.value)}
              required
            />
            <datalist id="categories">
              {uniqueCategoriesForForm.map(category => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="transactionDate" className="block text-sm font-semibold text-gray-700 mb-2">Date:</label>
            <input
              type="date"
              id="transactionDate"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200"
              value={newTransactionDate}
              onChange={(e) => setNewTransactionDate(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-center mt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Recent Transactions</h3>
        {transactionsLoading && <p className="text-blue-600 text-center text-lg mb-4">Loading transactions...</p>}
        {transactionsError && <p className="text-red-600 text-center text-lg mb-4">Error loading transactions: {transactionsError}</p>}
        <ul className="divide-y divide-gray-200">
          {transactions.slice(0, 5).map(transaction => (
            <li key={transaction.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="text-gray-900 font-medium">{transaction.description}</p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.transaction_date).toLocaleDateString()} - {transaction.category || 'N/A'}
                </p>
              </div>
              <span className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.type === 'expense' ? '-' : '+'}{'₹'}{(typeof transaction.amount === 'number' ? transaction.amount : 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        {transactions.length > 5 && (
          <div className="mt-4 text-right">
            <button
              onClick={() => navigate('/transactions')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm"
            >
              View All Transactions &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};