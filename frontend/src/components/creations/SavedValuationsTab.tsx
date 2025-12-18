/**
 * Saved Valuations Tab Component
 * Displays list of saved valuations with load/edit/delete/duplicate functionality
 */

import React, { useState, useEffect } from 'react';
import TradingAPI from '../../services/api';
import { Edit, Trash2, Copy, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface ValuationListItem {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface SavedValuationsTabProps {
  onLoadValuation?: (valuationId: number) => void;
  onValuationUpdated?: () => void;
}

export const SavedValuationsTab: React.FC<SavedValuationsTabProps> = ({
  onLoadValuation,
  onValuationUpdated,
}) => {
  const [valuations, setValuations] = useState<ValuationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  useEffect(() => {
    loadValuations();
  }, []);

  const loadValuations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await TradingAPI.listValuations();
      setValuations(response.valuations);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load valuations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (valuationId: number, valuationName: string) => {
    if (!confirm(`Are you sure you want to delete "${valuationName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(valuationId);
      await TradingAPI.deleteValuation(valuationId);
      await loadValuations();
      if (onValuationUpdated) {
        onValuationUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete valuation');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (valuationId: number) => {
    try {
      setDuplicatingId(valuationId);
      const valuation = await TradingAPI.getValuation(valuationId);
      const duplicate = await TradingAPI.saveValuation({
        name: `${valuation.name} (Copy)`,
        description: valuation.description || undefined,
        indicators: valuation.indicators,
        zscore_method: valuation.zscore_method,
        rolling_window: valuation.rolling_window,
        average_window: valuation.average_window || undefined,
        show_average: valuation.show_average,
        overbought_threshold: valuation.overbought_threshold,
        oversold_threshold: valuation.oversold_threshold,
        symbol: valuation.symbol,
        start_date: valuation.start_date || undefined,
        end_date: valuation.end_date || undefined,
      });
      await loadValuations();
      if (onValuationUpdated) {
        onValuationUpdated();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to duplicate valuation');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleLoad = async (valuationId: number) => {
    if (onLoadValuation) {
      onLoadValuation(valuationId);
    }
  };

  if (isLoading && valuations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading valuations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
        <Button
          onClick={loadValuations}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (valuations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">No saved valuations yet.</p>
        <p className="text-sm text-text-secondary">
          Create and save valuations from the Valuation page to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">Saved Valuations</h3>
        <Button
          onClick={loadValuations}
          variant="ghost"
          size="sm"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {valuations.map((valuation) => (
          <div
            key={valuation.id}
            className="p-4 border border-border-default rounded-lg bg-bg-secondary hover:border-primary-500/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-text-primary flex-1">{valuation.name}</h4>
            </div>
            {valuation.description && (
              <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                {valuation.description}
              </p>
            )}
            <p className="text-xs text-text-muted mb-4">
              Created: {new Date(valuation.created_at).toLocaleDateString()}
              {valuation.updated_at !== valuation.created_at && (
                <> • Updated: {new Date(valuation.updated_at).toLocaleDateString()}</>
              )}
            </p>
            <div className="flex gap-2 flex-wrap">
              {onLoadValuation && (
                <Button
                  onClick={() => handleLoad(valuation.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[80px]"
                >
                  Load
                </Button>
              )}
              <Button
                onClick={() => handleDuplicate(valuation.id)}
                variant="ghost"
                size="sm"
                disabled={duplicatingId === valuation.id}
                className="flex-1 min-w-[80px]"
              >
                {duplicatingId === valuation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleDelete(valuation.id, valuation.name)}
                variant="ghost"
                size="sm"
                disabled={deletingId === valuation.id}
                className="text-red-400 hover:text-red-300"
              >
                {deletingId === valuation.id ? (
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
