/**
 * Valuation Controls Component
 * Provides controls for selecting indicators, z-score settings, and thresholds
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ValuationIndicator } from '../../hooks/useValuation';

interface ValuationControlsProps {
  availableIndicators: ValuationIndicator[];
  selectedIndicators: string[];
  onIndicatorsChange: (indicators: string[]) => void;
  zscoreMethod: 'rolling' | 'all_time';
  onZscoreMethodChange: (method: 'rolling' | 'all_time') => void;
  rollingWindow: number;
  onRollingWindowChange: (window: number) => void;
  showAverage: boolean;
  onShowAverageChange: (show: boolean) => void;
  averageWindow: number | null;
  onAverageWindowChange: (window: number | null) => void;
  overboughtThreshold: number;
  onOverboughtThresholdChange: (threshold: number) => void;
  oversoldThreshold: number;
  onOversoldThresholdChange: (threshold: number) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  timeframe: '1h' | '4h' | '6h' | '12h' | '1d' | '1w' | 'custom' | null;
  onTimeframeChange: (timeframe: '1h' | '4h' | '6h' | '12h' | '1d' | '1w' | 'custom' | null) => void;
  bandIndicatorId: string | 'average' | null;
  onBandIndicatorChange: (indicatorId: string | 'average' | null) => void;
}

export const ValuationControls: React.FC<ValuationControlsProps> = ({
  availableIndicators,
  selectedIndicators,
  onIndicatorsChange,
  zscoreMethod,
  onZscoreMethodChange,
  rollingWindow,
  onRollingWindowChange,
  showAverage,
  onShowAverageChange,
  averageWindow,
  onAverageWindowChange,
  overboughtThreshold,
  onOverboughtThresholdChange,
  oversoldThreshold,
  onOversoldThresholdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  timeframe,
  onTimeframeChange,
  bandIndicatorId,
  onBandIndicatorChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    technical: true,
    fundamental: true,
  });

  // Group indicators by category
  const indicatorsByCategory = useMemo(() => {
    const grouped: Record<string, ValuationIndicator[]> = {
      technical: [],
      fundamental: [],
    };

    availableIndicators.forEach((indicator) => {
      if (grouped[indicator.category]) {
        grouped[indicator.category].push(indicator);
      }
    });

    return grouped;
  }, [availableIndicators]);

  // Filter indicators by search query
  const filteredIndicators = useMemo(() => {
    if (!searchQuery.trim()) {
      return indicatorsByCategory;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, ValuationIndicator[]> = {
      technical: [],
      fundamental: [],
    };

    Object.entries(indicatorsByCategory).forEach(([category, indicators]) => {
      filtered[category] = indicators.filter(
        (ind) =>
          ind.name.toLowerCase().includes(query) ||
          ind.id.toLowerCase().includes(query) ||
          ind.description.toLowerCase().includes(query)
      );
    });

    return filtered;
  }, [indicatorsByCategory, searchQuery]);

  const toggleIndicator = (indicatorId: string) => {
    if (selectedIndicators.includes(indicatorId)) {
      onIndicatorsChange(selectedIndicators.filter((id) => id !== indicatorId));
    } else {
      onIndicatorsChange([...selectedIndicators, indicatorId]);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const selectAllInCategory = (category: string) => {
    const categoryIndicators = filteredIndicators[category] || [];
    const categoryIds = categoryIndicators.map((ind) => ind.id);
    const newSelected = [
      ...selectedIndicators.filter((id) => {
        const ind = availableIndicators.find((i) => i.id === id);
        return ind?.category !== category;
      }),
      ...categoryIds,
    ];
    onIndicatorsChange(newSelected);
  };

  const deselectAllInCategory = (category: string) => {
    onIndicatorsChange(
      selectedIndicators.filter((id) => {
        const ind = availableIndicators.find((i) => i.id === id);
        return ind?.category !== category;
      })
    );
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Valuation Settings</h2>
      </div>

      {/* Timeframe Presets */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Timeframe
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            { id: '1h', label: '1H', supported: false },
            { id: '4h', label: '4H', supported: false },
            { id: '6h', label: '6H', supported: false },
            { id: '12h', label: '12H', supported: false },
            { id: '1d', label: '1D', supported: true },
            { id: '1w', label: '1W', supported: true },
            { id: 'custom', label: 'Custom', supported: true },
          ] as const).map(({ id, label, supported }) => {
            const isActive = (timeframe === id) || (id === 'custom' && timeframe === null);
            const isDisabled = !supported;
            
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (supported) {
                    onTimeframeChange(id === 'custom' ? null : id);
                  }
                }}
                disabled={isDisabled}
                title={!supported ? 'Coming soon - hourly data not yet available' : undefined}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg transition-all relative
                  ${
                    isActive && supported
                      ? 'bg-primary-500 text-white shadow-md'
                      : supported
                      ? 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary border border-border-default'
                      : 'bg-bg-tertiary/50 text-text-muted border border-border-default/50 cursor-not-allowed opacity-60'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {label}
                {!supported && (
                  <span className="absolute -top-1 -right-1 text-[8px] text-primary-400">*</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-1">
          <span className="text-primary-400">*</span> Hourly timeframes coming soon
        </p>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Date Range
        </label>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(date) => {
            onStartDateChange(date);
            // When manually changing dates, set timeframe to custom
            if (timeframe !== null && timeframe !== 'custom') {
              onTimeframeChange(null);
            }
          }}
          onEndDateChange={(date) => {
            onEndDateChange(date);
            // When manually changing dates, set timeframe to custom
            if (timeframe !== null && timeframe !== 'custom') {
              onTimeframeChange(null);
            }
          }}
        />
      </div>

      {/* Z-Score Method */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Z-Score Calculation Method
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="zscore-method"
              value="rolling"
              checked={zscoreMethod === 'rolling'}
              onChange={() => onZscoreMethodChange('rolling')}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-text-primary">Rolling Window</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="zscore-method"
              value="all_time"
              checked={zscoreMethod === 'all_time'}
              onChange={() => onZscoreMethodChange('all_time')}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-text-primary">All-Time</span>
          </label>
        </div>
      </div>

      {/* Rolling Window */}
      {zscoreMethod === 'rolling' && (
        <div>
          <Input
            type="number"
            label="Rolling Window Size"
            value={rollingWindow}
            onChange={(e) => onRollingWindowChange(parseInt(e.target.value) || 200)}
            min={10}
            max={1000}
            helperText="Number of periods for rolling mean/std calculation"
          />
        </div>
      )}

      {/* Average Z-Score Option */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showAverage}
            onChange={(e) => onShowAverageChange(e.target.checked)}
            className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded border-border-default"
          />
          <span className="text-sm font-medium text-text-primary">Show Average Z-Score</span>
        </label>
        {showAverage && (
          <div className="mt-2 ml-6">
            <Input
              type="number"
              label="Average Window Size (Optional)"
              value={averageWindow || ''}
              onChange={(e) => {
                const value = e.target.value;
                onAverageWindowChange(value === '' ? null : parseInt(value) || null);
              }}
              min={1}
              max={1000}
              helperText="Window size for smoothing the average z-score (leave empty for no smoothing)"
            />
          </div>
        )}
      </div>

      {/* Band Indicator Selector */}
      {selectedIndicators.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Overbought/Oversold Bands Indicator
          </label>
          <select
            value={bandIndicatorId || ''}
            onChange={(e) => onBandIndicatorChange(e.target.value === '' ? null : (e.target.value as string | 'average'))}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {selectedIndicators.map((indicatorId) => {
              const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
              return (
                <option key={indicatorId} value={indicatorId}>
                  {indicator ? indicator.name : indicatorId}
                </option>
              );
            })}
            {showAverage && (
              <option value="average">Average Z-Score</option>
            )}
          </select>
          <p className="text-xs text-text-muted mt-1">
            Select which indicator to use for overbought/oversold band shading
          </p>
        </div>
      )}

      {/* Thresholds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            type="number"
            label="Overbought Threshold"
            value={overboughtThreshold}
            onChange={(e) => onOverboughtThresholdChange(parseFloat(e.target.value) || 1.0)}
            step={0.1}
            helperText="Z-score threshold for overbought"
          />
        </div>
        <div>
          <Input
            type="number"
            label="Oversold Threshold"
            value={oversoldThreshold}
            onChange={(e) => onOversoldThresholdChange(parseFloat(e.target.value) || -1.0)}
            step={0.1}
            helperText="Z-score threshold for oversold"
          />
        </div>
      </div>

      {/* Indicator Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Select Indicators
        </label>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search indicators..."
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Indicator List */}
        <div className="space-y-4 max-h-64 md:max-h-96 overflow-y-auto">
          {(['technical', 'fundamental'] as const).map((category) => {
            const indicators = filteredIndicators[category] || [];
            const isExpanded = expandedCategories[category];
            const categorySelected = indicators.filter((ind) =>
              selectedIndicators.includes(ind.id)
            ).length;

            if (indicators.length === 0) return null;

            return (
              <div key={category} className="border border-border-default rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 bg-bg-tertiary hover:bg-bg-elevated transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary capitalize">
                      {category} ({categorySelected}/{indicators.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </button>

                {/* Category Actions */}
                {isExpanded && (
                  <div className="px-4 py-2 bg-bg-tertiary border-t border-border-default flex gap-2">
                    <button
                      onClick={() => selectAllInCategory(category)}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      Select All
                    </button>
                    <span className="text-text-muted">|</span>
                    <button
                      onClick={() => deselectAllInCategory(category)}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      Deselect All
                    </button>
                  </div>
                )}

                {/* Indicator Checkboxes */}
                {isExpanded && (
                  <div className="p-2 space-y-1">
                    {indicators.map((indicator) => {
                      const isSelected = selectedIndicators.includes(indicator.id);
                      const borderColor = category === 'fundamental' ? 'border-blue-500' : 'border-orange-500';
                      return (
                        <label
                          key={indicator.id}
                          className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors border-l-4 ${
                            isSelected
                              ? `bg-primary-500/10 hover:bg-primary-500/20 ${borderColor}`
                              : `hover:bg-bg-elevated ${borderColor}`
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleIndicator(indicator.id)}
                            className="mt-1 w-4 h-4 text-primary-500 focus:ring-primary-500 rounded border-border-default"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-primary">
                              {indicator.name}
                            </div>
                            <div className="text-xs text-text-muted line-clamp-1">
                              {indicator.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
