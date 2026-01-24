/**
 * Component for listing and selecting Full Cycle presets.
 */

import React, { useState, useEffect } from 'react';
import { TradingAPI } from '../../services/api';
import { Check, Loader2 } from 'lucide-react';

interface FullCyclePreset {
  id: number;
  name: string;
  description?: string;
  symbol?: string;
  exchange?: string;
  created_at: string;
  updated_at: string;
  type: string;
}

interface FullCyclePresetListProps {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onLoadPreset?: (id: number) => void;
}

export const FullCyclePresetList: React.FC<FullCyclePresetListProps> = ({
  selectedIds,
  onSelectionChange,
  onLoadPreset
}) => {
  const [presets, setPresets] = useState<FullCyclePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TradingAPI.getAllSavedStrategies();
      setPresets(data.fullcycle_presets || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Full Cycle presets');
      console.error('Error loading Full Cycle presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading Full Cycle presets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted border border-border-default rounded-lg">
        <p>No Full Cycle presets saved yet.</p>
        <p className="text-sm mt-2">Create presets in the Full Cycle Model tab to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {presets.map((preset) => (
        <div
          key={preset.id}
          className="flex items-start p-4 bg-bg-secondary border border-border-default rounded-lg hover:border-primary-500/50 transition-colors"
        >
          <button
            onClick={() => handleToggle(preset.id)}
            className={`flex-shrink-0 w-5 h-5 rounded border-2 mr-3 mt-0.5 flex items-center justify-center transition-colors ${
              selectedIds.includes(preset.id)
                ? 'bg-primary-500 border-primary-500'
                : 'border-border-default hover:border-primary-500'
            }`}
          >
            {selectedIds.includes(preset.id) && (
              <Check className="w-3 h-3 text-white" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-text-primary truncate">{preset.name}</h4>
              {onLoadPreset && (
                <button
                  onClick={() => onLoadPreset(preset.id)}
                  className="ml-2 px-3 py-1 text-sm bg-primary-500/20 text-primary-400 rounded hover:bg-primary-500/30 transition-colors"
                >
                  Load
                </button>
              )}
            </div>
            {preset.description && (
              <p className="text-sm text-text-muted mt-1 line-clamp-2">{preset.description}</p>
            )}
            <p className="text-xs text-text-muted mt-2">
              {(preset.symbol || 'BTCUSDT')} · {(preset.exchange || 'Binance')}
            </p>
            <p className="text-xs text-text-muted mt-2">
              Updated {new Date(preset.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

