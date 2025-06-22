import React from 'react';
import { Link } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  return (
    <nav className="w-64 bg-gray-800 text-white p-5 flex flex-col fixed h-full shadow-lg overflow-y-auto">
      <h3 className="mb-8 text-center text-gray-50 text-xl font-semibold">Personal Finance</h3>
      <ul className="list-none p-0">
        <li>
          <Link
            to="/home"
            className="flex items-center p-3 my-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <span role="img" aria-label="home" className="mr-3 text-lg">🏠</span> Home
          </Link>
        </li>
        <li>
          <Link
            to="/transactions"
            className="flex items-center p-3 my-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <span role="img" aria-label="history" className="mr-3 text-lg">📜</span> Transaction History
          </Link>
        </li>
                <li>
          <Link
            to="/lending-borrowing"
            className="flex items-center p-3 my-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <span role="img" aria-label="finance" className="mr-3 text-lg">🤝</span> Lending/Borrowing Tracker
          </Link>
        </li>
        <li>
          <Link
            to="/dashboard"
            className="flex items-center p-3 my-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <span role="img" aria-label="analytics" className="mr-3 text-lg">📊</span> Analytical Dashboard
          </Link>
        </li>

      </ul>
    </nav>
  );
};