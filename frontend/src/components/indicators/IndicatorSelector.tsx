/**
 * Indicator Selector Component
 * Allows users to select indicators to analyze
 */

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import type { IndicatorMetadata } from '../../services/api';

interface IndicatorSelectorProps {
  availableIndicators: Record<string, IndicatorMetadata>;
  selectedIndicators: Array<{ id: string; parameters: Record<string, any> }>;
  onIndicatorsChange: (indicators: Array<{ id: string; parameters: Record<string, any> }>) => void;
  isLoading?: boolean;
}

export const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  availableIndicators,
  selectedIndicators,
  onIndicatorsChange,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Group indicators by category
  const indicatorsByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ id: string; metadata: IndicatorMetadata }>> = {};

    Object.entries(availableIndicators).forEach(([id, metadata]) => {
      const category = metadata.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({ id, metadata });
    });

    return grouped;
  }, [availableIndicators]);

  // Filter indicators by search query
  const filteredIndicators = useMemo(() => {
    if (!searchQuery.trim()) {
      return indicatorsByCategory;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, Array<{ id: string; metadata: IndicatorMetadata }>> = {};

    Object.entries(indicatorsByCategory).forEach(([category, indicators]) => {
      filtered[category] = indicators.filter(
        ({ id, metadata }) =>
          id.toLowerCase().includes(query) ||
          metadata.name.toLowerCase().includes(query) ||
          metadata.description.toLowerCase().includes(query)
      );
    });

    return filtered;
  }, [indicatorsByCategory, searchQuery]);

  const toggleIndicator = (indicatorId: string) => {
    const isSelected = selectedIndicators.some((ind) => ind.id === indicatorId);

    if (isSelected) {
      onIndicatorsChange(selectedIndicators.filter((ind) => ind.id !== indicatorId));
    } else {
      const metadata = availableIndicators[indicatorId];
      if (!metadata) return;

      // Get default parameters
      const defaultParams: Record<string, any> = {};
      Object.entries(metadata.parameters || {}).forEach(([key, param]: [string, any]) => {
        defaultParams[key] = param.default;
      });

      onIndicatorsChange([
        ...selectedIndicators,
        {
          id: indicatorId,
          parameters: defaultParams,
        },
      ]);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const removeIndicator = (indicatorId: string) => {
    onIndicatorsChange(selectedIndicators.filter((ind) => ind.id !== indicatorId));
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4 md:p-6 space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">Select Indicators</h3>
        <p className="text-sm text-text-secondary">
          Choose indicators to analyze and generate signals
        </p>
      </div>

      {/* Selected Indicators Chips */}
      {selectedIndicators.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Selected ({selectedIndicators.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedIndicators.map((indicator) => {
              const metadata = availableIndicators[indicator.id];
              return (
                <div
                  key={indicator.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-lg"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {metadata?.name || indicator.id}
                  </span>
                  <button
                    onClick={() => removeIndicator(indicator.id)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search indicators..."
          className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Compact Card Grid */}
      <div className="space-y-4">
        {Object.entries(filteredIndicators).map(([category, indicators]) => {
          if (indicators.length === 0) return null;

          const isExpanded = expandedCategories[category] ?? true;
          const categorySelected = indicators.filter(({ id }) =>
            selectedIndicators.some((ind) => ind.id === id)
          ).length;

          return (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated transition-colors flex items-center justify-between rounded-lg mb-2"
              >
                <span className="text-sm font-semibold text-text-primary capitalize">
                  {category} ({categorySelected}/{indicators.length})
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>

              {/* Indicator Cards Grid */}
              {isExpanded && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {indicators.map(({ id, metadata }) => {
                    const isSelected = selectedIndicators.some((ind) => ind.id === id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleIndicator(id)}
                        disabled={isLoading}
                        className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-border-default bg-bg-tertiary hover:border-primary-500/50 hover:bg-bg-elevated'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="pr-6">
                          <div className="text-sm font-semibold text-text-primary mb-1">
                            {metadata.name}
                          </div>
                          <div className="text-xs text-text-muted line-clamp-2">
                            {metadata.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
