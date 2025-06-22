
import React, { useMemo, useState } from 'react';
import { useTransactions } from '../../contexts/TransactionContext';
import { useAccounts } from '../../contexts/AccountContext';
import { useNavigate } from 'react-router-dom';

export const TransactionHistoryPage: React.FC = () => {
  const { transactions, isLoading: transactionsLoading, error: transactionsError, deleteTransaction } = useTransactions();
  const { accounts, isLoading: accountsLoading, error: accountsError, refetchAccounts } = useAccounts();
  const navigate = useNavigate();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [dialogTransactionDescription, setDialogTransactionDescription] = useState<string>('');
  const [dialogTransactionDate, setDialogTransactionDate] = useState<string>('');


  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach(account => {
      map.set(account.id, account.name);
    });
    return map;
  }, [accounts]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA; 
      }
      const createdAtA = new Date(a.created_at).getTime();
      const createdAtB = new Date(b.created_at).getTime();
      return createdAtB - createdAtA;
    });
  }, [transactions]);


  const handleDeleteClick = (transactionId: string, description: string, date: string) => {
    setTransactionToDelete(transactionId);
    setDialogTransactionDescription(description);
    setDialogTransactionDate(new Date(date).toLocaleDateString());
    setShowConfirmDialog(true);
  };


  const confirmDelete = async () => {
    if (transactionToDelete) {
      try {
        await deleteTransaction(transactionToDelete);
        await refetchAccounts(); 
        console.log('Transaction deleted and accounts refreshed successfully!');
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        alert('Failed to delete transaction. Please try again.'); 
      } finally {
        setShowConfirmDialog(false);
        setTransactionToDelete(null);
        setDialogTransactionDescription('');
        setDialogTransactionDate('');
      }
    }
  };


  const cancelDelete = () => {
    setShowConfirmDialog(false);
    setTransactionToDelete(null);
    setDialogTransactionDescription('');
    setDialogTransactionDate('');
  };

  if (transactionsLoading || accountsLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-xl text-indigo-600">Loading transactions...</p>
      </div>
    );
  }

  if (transactionsError || accountsError) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-100">
        <p className="text-xl text-red-600">Error loading data: {transactionsError || accountsError}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-5xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">All Transactions</h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors duration-200"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {sortedTransactions.length === 0 ? (
        <p className="text-center text-gray-500 text-lg">No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-800">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {transaction.description}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                    {transaction.category}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-600">
                    {accountMap.get(transaction.account_id) || 'Unknown Account'}
                  </td>
                  <td className={`py-3 px-4 whitespace-nowrap text-right text-base font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'expense' ? '-' : '+'}{'₹'}{(typeof transaction.amount === 'number' ? transaction.amount : 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteClick(transaction.id, transaction.description, transaction.transaction_date)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                      aria-label={`Delete transaction ${transaction.description}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div
            className="absolute inset-0 backdrop-blur-sm bg-black/10"
            onClick={cancelDelete}
          />

          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-auto z-10 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the transaction:
              <br />
              <span className="font-semibold">"{dialogTransactionDescription}"</span> on{' '}
              <span className="font-semibold">{dialogTransactionDate}</span>?
              <br />
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
