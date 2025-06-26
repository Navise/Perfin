import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { AccountProvider } from './contexts/AccountContext.tsx';
import { TransactionProvider } from './contexts/TransactionContext.tsx';
import { LendingBorrowingProvider } from './pages/LendingBorrowingTrackerPage/LendingBorrowingTrackerPage';

import { datadogRum } from '@datadog/browser-rum';
import { ErrorBoundary, reactPlugin } from '@datadog/browser-rum-react';

import { BrowserRouter } from 'react-router-dom'; 
declare global {
  interface Window {
    datadogRum: typeof datadogRum;
  }
}

window.datadogRum = datadogRum;

datadogRum.init({
  applicationId: import.meta.env.VITE_DATADOG_APPLICATION_ID,
  clientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
  site: import.meta.env.VITE_DATADOG_SITE,
  service: 'finance-tracker-frontend',               
  env: import.meta.env.MODE,                         
  version: '1.0.0',                                  
  sessionSampleRate: 100,            
  sessionReplaySampleRate: 20,       
  trackUserInteractions: true,       
  trackResources: true,             
  trackLongTasks: true,           
  defaultPrivacyLevel: 'mask-user-input', 
  plugins: [reactPlugin({ router: true })], 
});


datadogRum.startSessionReplayRecording();


const ErrorFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700 text-center p-4">
    <p className="text-xl font-semibold">
       Something went wrong with the application.
      <br />
    </p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={ErrorFallback}>
       <BrowserRouter>
        <AuthProvider>
          <AccountProvider>
            <TransactionProvider>
              
                <LendingBorrowingProvider>
                  <App />
                </LendingBorrowingProvider>
              
            </TransactionProvider>
          </AccountProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);


