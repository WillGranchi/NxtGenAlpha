/**
 * Saved Full Cycle Models Tab
 * Displays saved Full Cycle presets
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Play } from 'lucide-react';
import TradingAPI from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface SavedFullCyclePreset {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SavedFullCycleTabProps {
  onLoadPreset?: (presetId: number) => void;
}

export const SavedFullCycleTab: React.FC<SavedFullCycleTabProps> = ({
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<SavedFullCyclePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const response = await TradingAPI.listFullCyclePresets();
      if (response.success) {
        setPresets(response.presets);
      }
    } catch (err) {
      console.error('Failed to load Full Cycle presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPreset = async (presetId: number) => {
    if (onLoadPreset) {
      onLoadPreset(presetId);
    } else {
      // Navigate to Full Cycle page and load the preset
      navigate('/fullcycle', { state: { presetId } });
    }
  };

  const handleDeletePreset = async (presetId: number) => {
    if (!confirm('Are you sure you want to delete this Full Cycle preset?')) {
      return;
    }

    try {
      await TradingAPI.deleteFullCyclePreset(presetId);
      await loadPresets();
    } catch (err: any) {
      console.error('Failed to delete preset:', err);
      alert(err?.response?.data?.detail || 'Failed to delete preset');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-text-muted mb-4" />
        <p className="text-text-secondary">Loading saved Full Cycle models...</p>
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary mb-4">
          No saved Full Cycle models yet.
        </p>
        <p className="text-sm text-text-muted">
          Create and save Full Cycle configurations from the Full Cycle Model page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {presets.map((preset) => (
        <div
          key={preset.id}
          className="bg-bg-tertiary border border-border-default rounded-lg p-4 hover:border-primary-500/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {preset.name}
              </h3>
              {preset.description && (
                <p className="text-sm text-text-secondary mb-2">
                  {preset.description}
                </p>
              )}
              <div className="text-xs text-text-muted">
                Created: {new Date(preset.created_at).toLocaleDateString()}
                {preset.updated_at !== preset.created_at && (
                  <span className="ml-2">
                    • Updated: {new Date(preset.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleLoadPreset(preset.id)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors"
              >
                <Play className="w-4 h-4" />
                Load
              </button>
              <button
                onClick={() => handleDeletePreset(preset.id)}
                className="p-2 text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 rounded transition-colors"
                title="Delete preset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

