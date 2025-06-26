import React, { useMemo } from 'react';
import { useTransactions } from '../../contexts/TransactionContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  transaction_date: string; 
};

export const AnalyticalDashboardPage: React.FC = () => {
  const { transactions } = useTransactions();

  const { totalIncome, totalExpense, currentBalance, expenseByCategory } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categories: { [key: string]: number } = {};

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        income += transaction.amount;
      } else {
        expense += transaction.amount;
        if (transaction.category) {
          categories[transaction.category] = (categories[transaction.category] || 0) + transaction.amount;
        }
      }
    });

    const balance = income - expense;

    const expenseChartData = Object.keys(categories).map(category => ({
      name: category,
      value: categories[category],
    }));

    return {
      totalIncome: income,
      totalExpense: expense,
      currentBalance: balance,
      expenseByCategory: expenseChartData,
    };
  }, [transactions]);

  const { monthlyIncome, monthlyExpense, monthlyBalance } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date); 
      if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
        if (transaction.type === 'income') {
          income += transaction.amount;
        } else {
          expense += transaction.amount;
        }
      }
    });

    const balance = income - expense;

    return {
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlyBalance: balance,
    };
  }, [transactions]);

  const monthlyBreakdownData = [
    { name: 'Income', value: monthlyIncome, color: '#4CAF50' },
    { name: 'Expense', value: monthlyExpense, color: '#F44336' },
  ];

  const monthlyBalancesData = useMemo(() => {
    const monthlyData: { [key: string]: { income: number; expense: number; balance: number } } = {};

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date); 
      const yearMonth = `${transactionDate.getFullYear()}-${(transactionDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { income: 0, expense: 0, balance: 0 };
      }

      if (transaction.type === 'income') {
        monthlyData[yearMonth].income += transaction.amount;
      } else {
        monthlyData[yearMonth].expense += transaction.amount;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const chartData = [];
    let cumulativeBalance = 0;

    for (const month of sortedMonths) {
      const monthData = monthlyData[month];
      const monthlyBalance = monthData.income - monthData.expense;
      cumulativeBalance += monthlyBalance;

      chartData.push({
        name: month,
        income: monthData.income,
        expense: monthData.expense,
        monthlyBalance: monthlyBalance,
        cumulativeBalance: cumulativeBalance,
      });
    }

    return chartData;
  }, [transactions]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Analytical Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-500 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
          <p className="text-sm font-semibold opacity-80 mb-1">Total Income (All Time)</p>
          <p className="text-3xl font-extrabold">₹{totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-red-500 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
          <p className="text-sm font-semibold opacity-80 mb-1">Total Expense (All Time)</p>
          <p className="text-3xl font-extrabold">₹{totalExpense.toFixed(2)}</p>
        </div>
        <div className="bg-green-500 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
          <p className="text-sm font-semibold opacity-80 mb-1">Current Balance (All Time)</p>
          <p className="text-3xl font-extrabold">₹{currentBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Current Month's Overview</h3>
          <p className="text-lg mb-2">Income: <span className="font-bold text-green-600">₹{monthlyIncome.toFixed(2)}</span></p>
          <p className="text-lg mb-2">Expense: <span className="font-bold text-red-600">₹{monthlyExpense.toFixed(2)}</span></p>
          <p className="text-lg font-bold">Monthly Balance: <span className={monthlyBalance >= 0 ? 'text-green-700' : 'text-red-700'}>₹{monthlyBalance.toFixed(2)}</span></p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-md flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Monthly Income vs. Expense</h3>
          {monthlyIncome === 0 && monthlyExpense === 0 ? (
            <p className="text-gray-600">No transactions for the current month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={monthlyBreakdownData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {monthlyBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`₹${value.toFixed(2)}`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Monthly Balance Trend</h3>
        {monthlyBalancesData.length === 0 ? (
          <p className="text-gray-600">No monthly data to display for charting.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={monthlyBalancesData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" unit="₹" />
              <Tooltip formatter={(value: number, name: string) => [`₹${value.toFixed(2)}`, name === 'cumulativeBalance' ? 'Balance' : name]} />
              <Legend />
              <Line type="monotone" dataKey="cumulativeBalance" stroke="#8884d8" name="Cumulative Balance" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Expenses by Category (All Time)</h3>
        {expenseByCategory.length === 0 ? (
          <p className="text-gray-600">No expense data to display for charting.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={expenseByCategory}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" unit="₹" />
              <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Amount Spent" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
};