/**
 * Preset Manager Component
 * Save, load, and delete Full Cycle presets
 */

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Trash2, X } from 'lucide-react';
import TradingAPI from '../../services/api';

interface Preset {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface PresetManagerProps {
  onLoadPreset: (preset: {
    indicator_params: Record<string, Record<string, number>>;
    selected_indicators: string[];
    start_date?: string;
    end_date?: string;
    roc_days: number;
    show_fundamental_average: boolean;
    show_technical_average: boolean;
    show_overall_average: boolean;
  }) => void;
  currentConfig: {
    indicator_params: Record<string, Record<string, number>>;
    selected_indicators: string[];
    start_date: string;
    end_date: string;
    roc_days: number;
    show_fundamental_average: boolean;
    show_technical_average: boolean;
    show_overall_average: boolean;
  };
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  onLoadPreset,
  currentConfig,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Load presets on mount
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
      console.error('Failed to load presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    try {
      setSaving(true);
      await TradingAPI.createFullCyclePreset({
        name: presetName,
        description: presetDescription || undefined,
        indicator_params: currentConfig.indicator_params,
        selected_indicators: currentConfig.selected_indicators,
        start_date: currentConfig.start_date || undefined,
        end_date: currentConfig.end_date || undefined,
        roc_days: currentConfig.roc_days,
        show_fundamental_average: currentConfig.show_fundamental_average,
        show_technical_average: currentConfig.show_technical_average,
        show_overall_average: currentConfig.show_overall_average,
      });
      
      setShowSaveModal(false);
      setPresetName('');
      setPresetDescription('');
      await loadPresets();
    } catch (err: any) {
      console.error('Failed to save preset:', err);
      alert(err?.response?.data?.detail || 'Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPreset = async (presetId: number) => {
    try {
      setLoading(true);
      const response = await TradingAPI.getFullCyclePreset(presetId);
      if (response.success) {
        onLoadPreset({
          indicator_params: response.preset.indicator_params,
          selected_indicators: response.preset.selected_indicators,
          start_date: response.preset.start_date,
          end_date: response.preset.end_date,
          roc_days: response.preset.roc_days,
          show_fundamental_average: response.preset.show_fundamental_average,
          show_technical_average: response.preset.show_technical_average,
          show_overall_average: response.preset.show_overall_average,
        });
      }
    } catch (err: any) {
      console.error('Failed to load preset:', err);
      alert(err?.response?.data?.detail || 'Failed to load preset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (presetId: number) => {
    if (!confirm('Are you sure you want to delete this preset?')) {
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

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Presets</h3>
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors"
          disabled={saving}
        >
          <Save className="w-4 h-4" />
          Save Current
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-text-primary">Save Preset</h4>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPresetName('');
                  setPresetDescription('');
                }}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Conservative, Aggressive"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Description
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setPresetName('');
                    setPresetDescription('');
                  }}
                  className="px-4 py-2 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={saving || !presetName.trim()}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-text-muted" />
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p>No presets saved yet. Save your current configuration to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg hover:bg-bg-tertiary/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary">{preset.name}</div>
                {preset.description && (
                  <div className="text-sm text-text-secondary truncate">{preset.description}</div>
                )}
                <div className="text-xs text-text-muted mt-1">
                  {new Date(preset.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleLoadPreset(preset.id)}
                  className="px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded text-sm transition-colors"
                  disabled={loading}
                >
                  Load
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="p-1.5 text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 rounded transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

