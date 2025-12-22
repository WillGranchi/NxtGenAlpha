import React, { useState, useEffect } from 'react';
import TradingAPI, { StrategyListItem, StrategyResponse } from '../../services/api';

interface StrategyManagerProps {
  onSelectStrategy?: (strategy: StrategyResponse) => void;
  onStrategyUpdated?: () => void;
}

const StrategyManager: React.FC<StrategyManagerProps> = ({
  onSelectStrategy,
  onStrategyUpdated,
}) => {
  const [strategies, setStrategies] = useState<StrategyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await TradingAPI.listSavedStrategies();
      setStrategies(response.strategies);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load strategies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (strategyId: number, strategyName: string) => {
    if (!confirm(`Are you sure you want to delete "${strategyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(strategyId);
      await TradingAPI.deleteStrategy(strategyId);
      await loadStrategies();
      if (onStrategyUpdated) {
        onStrategyUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete strategy');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (strategyId: number) => {
    try {
      setDuplicatingId(strategyId);
      await TradingAPI.duplicateStrategy(strategyId);
      await loadStrategies();
      if (onStrategyUpdated) {
        onStrategyUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to duplicate strategy');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleEdit = async (strategyId: number) => {
    try {
      const strategy = await TradingAPI.getSavedStrategy(strategyId);
      if (onSelectStrategy) {
        onSelectStrategy(strategy);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load strategy');
    }
  };

  if (isLoading && strategies.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && strategies.length === 0) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={loadStrategies}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No saved strategies yet.</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Create and save a strategy to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Strategies</h2>
        <button
          onClick={loadStrategies}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{strategy.name}</h3>
                {strategy.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {strategy.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Created: {new Date(strategy.created_at).toLocaleDateString()}
                  {strategy.updated_at !== strategy.created_at && (
                    <> • Updated: {new Date(strategy.updated_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(strategy.id)}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  title="Load strategy"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDuplicate(strategy.id)}
                  className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50"
                  disabled={duplicatingId === strategy.id}
                  title="Duplicate strategy"
                >
                  {duplicatingId === strategy.id ? '...' : 'Duplicate'}
                </button>
                <button
                  onClick={() => handleDelete(strategy.id, strategy.name)}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                  disabled={deletingId === strategy.id}
                  title="Delete strategy"
                >
                  {deletingId === strategy.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyManager;

