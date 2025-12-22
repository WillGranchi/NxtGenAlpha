/**
 * Saved Strategies Tab Component
 * Displays list of saved strategies with load/edit/delete/duplicate functionality
 */

import React, { useState, useEffect } from 'react';
import TradingAPI, { StrategyListItem } from '../../services/api';
import { Edit, Trash2, Copy, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface SavedStrategiesTabProps {
  onLoadStrategy?: (strategyId: number) => void;
  onStrategyUpdated?: () => void;
}

export const SavedStrategiesTab: React.FC<SavedStrategiesTabProps> = ({
  onLoadStrategy,
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

  const handleLoad = async (strategyId: number) => {
    if (onLoadStrategy) {
      onLoadStrategy(strategyId);
    }
  };

  if (isLoading && strategies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading strategies...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
        <Button
          onClick={loadStrategies}
          variant="secondary"
          size="sm"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">No saved strategies yet.</p>
        <p className="text-sm text-text-secondary">
          Create and save strategies from the Dashboard to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">Saved Strategies</h3>
        <Button
          onClick={loadStrategies}
          variant="ghost"
          size="sm"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className="p-4 border border-border-default rounded-lg bg-bg-secondary hover:border-primary-500/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-text-primary flex-1">{strategy.name}</h4>
            </div>
            {strategy.description && (
              <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                {strategy.description}
              </p>
            )}
            <p className="text-xs text-text-muted mb-4">
              Created: {new Date(strategy.created_at).toLocaleDateString()}
              {strategy.updated_at !== strategy.created_at && (
                <> • Updated: {new Date(strategy.updated_at).toLocaleDateString()}</>
              )}
            </p>
            <div className="flex gap-2 flex-wrap">
              {onLoadStrategy && (
                <Button
                  onClick={() => handleLoad(strategy.id)}
                  variant="secondary"
                  size="sm"
                  className="flex-1 min-w-[80px]"
                >
                  Load
                </Button>
              )}
              <Button
                onClick={() => handleDuplicate(strategy.id)}
                variant="ghost"
                size="sm"
                disabled={duplicatingId === strategy.id}
                className="flex-1 min-w-[80px]"
              >
                {duplicatingId === strategy.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleDelete(strategy.id, strategy.name)}
                variant="ghost"
                size="sm"
                disabled={deletingId === strategy.id}
                className="text-red-400 hover:text-red-300"
              >
                {deletingId === strategy.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
