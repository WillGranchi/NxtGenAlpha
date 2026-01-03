/**
 * Main App component with routing
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import IndicatorsPage from './pages/IndicatorsPage';
import StrategyLibraryPage from './pages/StrategyLibraryPage';
import SettingsPage from './pages/SettingsPage';
import ValuationPage from './pages/ValuationPage';
import FullCyclePage from './pages/FullCyclePage';
import PriceTestPage from './pages/PriceTestPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/indicators"
            element={
              <ProtectedRoute>
                <Layout>
                  <IndicatorsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Layout>
                  <StrategyLibraryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/valuation"
            element={
              <ProtectedRoute>
                <Layout>
                  <ValuationPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/fullcycle"
            element={
              <ProtectedRoute>
                <Layout>
                  <FullCyclePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricetest"
            element={
              <ProtectedRoute>
                <Layout>
                  <PriceTestPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

