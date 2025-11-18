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
      <div className="p-4 border border-border-default rounded-lg">
        <div className="flex items-center space-x-2 text-text-secondary">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
          <span>Loading strategies...</span>
        </div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="p-4 border border-border-default rounded-lg bg-bg-secondary">
        <p className="text-sm text-text-secondary">
          No saved strategies yet. Create and save a strategy to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary mb-2">
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
        className="input"
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
        <div className="text-sm text-danger-400 mt-1">{error}</div>
      )}
      {selectedId && (
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-primary-400 hover:text-primary-300 hover:underline"
        >
          Clear selection
        </button>
      )}
    </div>
  );
};

export default StrategySelector;
