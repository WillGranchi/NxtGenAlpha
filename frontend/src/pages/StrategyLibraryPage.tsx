/**
 * My Creations page
 * Displays saved strategies and valuations in tabs
 */

import React, { useState } from 'react';
import { SavedStrategiesTab } from '../components/creations/SavedStrategiesTab';
import { SavedValuationsTab } from '../components/creations/SavedValuationsTab';
import { useNavigate } from 'react-router-dom';

const StrategyLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'strategies' | 'valuations'>('strategies');
  const navigate = useNavigate();

  const handleLoadStrategy = (strategyId: number) => {
    // Navigate to dashboard with strategy ID (could be enhanced with query params)
    navigate('/dashboard');
    // Note: The dashboard would need to handle loading the strategy
    // This is a placeholder - actual implementation would need to pass the strategy ID
  };

  const handleLoadValuation = (valuationId: number) => {
    // Navigate to valuation page with valuation ID (could be enhanced with query params)
    navigate('/valuation');
    // Note: The valuation page would need to handle loading the valuation
    // This is a placeholder - actual implementation would need to pass the valuation ID
  };

  return (
    <div className="min-h-screen bg-bg-primary p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">My Creations</h1>
          <p className="text-text-secondary">Manage your saved strategies and valuations</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border-default mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('strategies')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'strategies'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Saved Strategies
            </button>
            <button
              onClick={() => setActiveTab('valuations')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'valuations'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Saved Valuations
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          {activeTab === 'strategies' && (
            <SavedStrategiesTab
              onLoadStrategy={handleLoadStrategy}
            />
          )}
          {activeTab === 'valuations' && (
            <SavedValuationsTab
              onLoadValuation={handleLoadValuation}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyLibraryPage;

