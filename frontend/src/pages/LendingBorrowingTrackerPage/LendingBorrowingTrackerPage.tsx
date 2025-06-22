import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
const baseUrl = import.meta.env.VITE_API_BASE_URL as string;

export interface LendingBorrowingEntry {
  id: string;
  type: 'lent' | 'borrowed';
  person: string;
  amount: number;
  date: string;
  due_date?: string;
  status: 'outstanding' | 'paid' | 'overdue';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface LendingBorrowingContextType {
  entries: LendingBorrowingEntry[];
  isLoading: boolean;
  error: string | null;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<LendingBorrowingEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<LendingBorrowingEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

const LendingBorrowingContext = createContext<LendingBorrowingContextType | undefined>(undefined);

export const LendingBorrowingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<LendingBorrowingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/lending-borrowing`);
      const data = await res.json();
      const entriesWithNumberAmount = data.entries.map((entry: any) => ({
        ...entry,
        amount: Number(entry.amount),
      }));
      setEntries(entriesWithNumberAmount);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEntry = async (entry: Omit<LendingBorrowingEntry, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/lending-borrowing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      await fetchEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to add entry');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = async (id: string, updates: Partial<LendingBorrowingEntry>) => {
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/lending-borrowing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await fetchEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to update entry');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/lending-borrowing/${id}`, { method: 'DELETE' });
      await fetchEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LendingBorrowingContext.Provider value={{ entries, isLoading, error, fetchEntries, addEntry, updateEntry, deleteEntry }}>
      {children}
    </LendingBorrowingContext.Provider>
  );
};

export const useLendingBorrowing = () => {
  const ctx = useContext(LendingBorrowingContext);
  if (!ctx) throw new Error('useLendingBorrowing must be used within a LendingBorrowingProvider');
  return ctx;
};

export const LendingBorrowingTrackerPage: React.FC = () => {
  const { entries, fetchEntries, addEntry, updateEntry, deleteEntry } = useLendingBorrowing();

  const [newEntryType, setNewEntryType] = useState<'lent' | 'borrowed'>('lent');
  const [newEntryPerson, setNewEntryPerson] = useState('');
  const [newEntryAmount, setNewEntryAmount] = useState('');
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEntryDueDate, setNewEntryDueDate] = useState('');
  const [newEntryNotes, setNewEntryNotes] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'outstanding' | 'paid' | 'overdue'>('all');
  const [editingEntry, setEditingEntry] = useState<LendingBorrowingEntry | null>(null);


  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEntryPerson && newEntryAmount) {
      const newEntry: Omit<LendingBorrowingEntry, 'id' | 'created_at' | 'updated_at'> = {
        type: newEntryType,
        person: newEntryPerson,
        amount: parseFloat(newEntryAmount),
        date: newEntryDate,
        due_date: newEntryDueDate || undefined,
        status: 'outstanding',
        notes: newEntryNotes || undefined,
      };
      await addEntry(newEntry);
      setNewEntryPerson('');
      setNewEntryAmount('');
      setNewEntryDate(new Date().toISOString().split('T')[0]);
      setNewEntryDueDate('');
      setNewEntryNotes('');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(id);
  };

  const handleStatusChange = async (id: string, newStatus: 'outstanding' | 'paid' | 'overdue') => {
    await updateEntry(id, { status: newStatus });
  };

  const handleEditEntry = (entry: LendingBorrowingEntry) => {
    setEditingEntry(entry);
  };

  const handleSaveEdit = async () => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, editingEntry);
      setEditingEntry(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = entry.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [entries, searchTerm, filterStatus]);

  const summary = useMemo(() => {
    const summary: { [person: string]: { lent: number; borrowed: number; net: number } } = {};
    entries.forEach(entry => {
      if (!summary[entry.person]) summary[entry.person] = { lent: 0, borrowed: 0, net: 0 };
      const amount = Number(entry.amount);
      if (entry.type === 'lent') {
        summary[entry.person].lent += amount;
        summary[entry.person].net -= amount;
      } else {
        summary[entry.person].borrowed += amount;
        summary[entry.person].net += amount;
      }
    });
    return Object.entries(summary)
      .map(([person, amounts]) => ({
        person,
        lent: Number(amounts.lent),       
        borrowed: Number(amounts.borrowed),
        net: Number(amounts.net),       
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [entries]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Lending & Borrowing Tracker</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Entry</h3>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newEntryType}
                  onChange={(e) => setNewEntryType(e.target.value as 'lent' | 'borrowed')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="lent">Lent</option>
                  <option value="borrowed">Borrowed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                <input
                  type="text"
                  value={newEntryPerson}
                  onChange={(e) => setNewEntryPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Person's name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={newEntryAmount}
                  onChange={(e) => setNewEntryAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntryDate}
                  onChange={(e) => setNewEntryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={newEntryDueDate}
                onChange={(e) => setNewEntryDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={newEntryNotes}
                onChange={(e) => setNewEntryNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              Add Entry
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Summary by Person</h3>
          <div className="space-y-3">
            {summary.map((personSummary) => (
              <div key={personSummary.person} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">{personSummary.person}</h4>
                <div className="text-sm text-gray-600 mt-1">
                  <p>Lent: ₹{personSummary.lent.toFixed(2)}</p>
                  <p>Borrowed: ₹{personSummary.borrowed.toFixed(2)}</p>
                  <p className={`font-semibold ${personSummary.net > 0 ? 'text-red-600' : personSummary.net < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    Net: {personSummary.net > 0 ? 'You owe' : personSummary.net < 0 ? 'You are owed' : 'Settled'} ₹{Math.abs(personSummary.net).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">All Entries</h3>
        <div className="mb-4 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by person or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'outstanding' | 'paid' | 'overdue')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="outstanding">Outstanding</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      entry.type === 'lent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.person}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{Number(entry.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.due_date || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={entry.status}
                      onChange={(e) => handleStatusChange(entry.id, e.target.value as 'outstanding' | 'paid' | 'overdue')}
                      className={`px-2 py-1 rounded-full text-xs font-semibold border-0 ${
                        entry.status === 'paid' ? 'bg-green-100 text-green-800' :
                        entry.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="outstanding">Outstanding</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{entry.notes || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-900 transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-filter backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Entry</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={editingEntry.type}
                    onChange={(e) => setEditingEntry({ ...editingEntry, type: e.target.value as 'lent' | 'borrowed' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="lent">Lent</option>
                    <option value="borrowed">Borrowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                  <input
                    type="text"
                    value={editingEntry.person}
                    onChange={(e) => setEditingEntry({ ...editingEntry, person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={editingEntry.amount}
                    onChange={(e) => setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={editingEntry.due_date || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, due_date: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={editingEntry.notes || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
