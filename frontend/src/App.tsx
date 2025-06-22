import { Routes, Route, Navigate } from 'react-router-dom';
import { PinLoginPage } from './pages/PinLoginPage/PinLoginPage';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { DashboardPage } from './pages/DashboardPage/DashboardPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage/TransactionHistoryPage';
import { AnalyticalDashboardPage } from './pages/AnalyticalDashboardPage/AnalyticalDashboardPage';
import { LendingBorrowingTrackerPage } from './pages/LendingBorrowingTrackerPage/LendingBorrowingTrackerPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PinLoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="home" element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionHistoryPage />} />
        <Route path="dashboard" element={<AnalyticalDashboardPage />} />
        <Route path="lending-borrowing" element={<LendingBorrowingTrackerPage />} />
      </Route>

      <Route path="*" element={<div>404 - Page Not Found</div>} />
    </Routes>
  );
}

export default App;