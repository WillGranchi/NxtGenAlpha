import React, { useState, useEffect } from 'react';
import TradingAPI, { StrategyListItem, StrategyResponse } from '../../services/api';

interface StrategySelectorProps {
  onSelectStrategy: (strategy: StrategyResponse) => void;
  onLoadStrategies?: (strategies: StrategyListItem[]) => void;
}

const StrategySelector: React.FC<StrategySelectorProps> = ({
  onSelectStrategy,
  onLoadStrategies,
}) => {
  const [strategies, setStrategies] = useState<StrategyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await TradingAPI.listSavedStrategies();
      setStrategies(response.strategies);
      if (onLoadStrategies) {
        onLoadStrategies(response.strategies);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load strategies');
      console.error('Failed to load strategies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (strategyId: number) => {
    if (selectedId === strategyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const strategy = await TradingAPI.getSavedStrategy(strategyId);
      setSelectedId(strategyId);
      onSelectStrategy(strategy);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load strategy');
      console.error('Failed to load strategy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && strategies.length === 0) {
    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 dark:border-gray-400"></div>
          <span>Loading strategies...</span>
        </div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No saved strategies yet. Create and save a strategy to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Load Saved Strategy
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => {
          const id = e.target.value ? parseInt(e.target.value) : null;
          if (id) {
            handleSelect(id);
          } else {
            setSelectedId(null);
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={isLoading}
      >
        <option value="">Select a strategy...</option>
        {strategies.map((strategy) => (
          <option key={strategy.id} value={strategy.id}>
            {strategy.name}
            {strategy.description && ` - ${strategy.description}`}
          </option>
        ))}
      </select>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</div>
      )}
      {selectedId && (
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Clear selection
        </button>
      )}
    </div>
  );
};

export default StrategySelector;
