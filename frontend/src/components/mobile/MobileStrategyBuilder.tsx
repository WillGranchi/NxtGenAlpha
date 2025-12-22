/**
 * Simplified mobile-friendly strategy builder
 * Form-based interface optimized for touch interactions
 */

import React, { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface MobileStrategyBuilderProps {
  availableIndicators: Record<string, IndicatorMetadata> | null;
  selectedIndicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  expression: string;
  onExpressionChange: (expression: string) => void;
  availableConditions: Record<string, string>;
  className?: string;
}

export const MobileStrategyBuilder: React.FC<MobileStrategyBuilderProps> = ({
  availableIndicators,
  selectedIndicators,
  onIndicatorsChange,
  expression,
  onExpressionChange,
  availableConditions,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showIndicatorPicker, setShowIndicatorPicker] = useState(false);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  if (!availableIndicators) {
    return (
      <div className="p-4 text-center text-text-muted">
        Loading indicators...
      </div>
    );
  }

  // Group indicators by category
  const indicatorsByCategory = Object.entries(availableIndicators).reduce((acc, [id, metadata]) => {
    const category = metadata.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ id, ...metadata });
    return acc;
  }, {} as Record<string, Array<{ id: string } & IndicatorMetadata>>);

  const categories = ['All', ...Object.keys(indicatorsByCategory)];

  const filteredIndicators = selectedCategory === 'All'
    ? Object.entries(availableIndicators)
    : Object.entries(availableIndicators).filter(([_, meta]) => 
        (meta.category || 'Other') === selectedCategory
      );

  const addIndicator = (indicatorId: string) => {
    const metadata = availableIndicators[indicatorId];
    if (!metadata) return;

    const defaultParams: Record<string, any> = {};
    Object.entries(metadata.parameters).forEach(([key, param]: [string, any]) => {
      defaultParams[key] = param.default;
    });

    const newIndicator: IndicatorConfig = {
      id: indicatorId,
      params: defaultParams,
      show_on_chart: false,
    };

    onIndicatorsChange([...selectedIndicators, newIndicator]);
    setShowIndicatorPicker(false);
  };

  const removeIndicator = (index: number) => {
    onIndicatorsChange(selectedIndicators.filter((_, i) => i !== index));
  };

  const updateIndicatorParams = (index: number, paramName: string, value: number) => {
    const updated = [...selectedIndicators];
    updated[index] = {
      ...updated[index],
      params: {
        ...updated[index].params,
        [paramName]: value,
      },
    };
    onIndicatorsChange(updated);
  };

  const addConditionToExpression = (conditionName: string) => {
    const currentExpr = expression.trim();
    const newExpr = currentExpr 
      ? `${currentExpr} AND ${conditionName}`
      : conditionName;
    onExpressionChange(newExpr);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selected Indicators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Selected Indicators</h3>
          <Button
            onClick={() => setShowIndicatorPicker(true)}
            variant="primary"
            size="sm"
            className="flex items-center gap-2 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            Add Indicator
          </Button>
        </div>

        {selectedIndicators.length === 0 ? (
          <div className="p-6 text-center bg-bg-secondary rounded-lg border border-border-default">
            <p className="text-text-muted text-sm">No indicators selected</p>
            <p className="text-text-muted text-xs mt-1">Tap "Add Indicator" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedIndicators.map((indicator, index) => {
              const metadata = availableIndicators[indicator.id];
              const isExpanded = expandedIndicator === indicator.id;

              return (
                <div
                  key={`${indicator.id}-${index}`}
                  className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden"
                >
                  {/* Indicator Header */}
                  <div
                    className="p-4 flex items-center justify-between touch-manipulation cursor-pointer"
                    onClick={() => setExpandedIndicator(isExpanded ? null : indicator.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-text-primary">{metadata?.name || indicator.id}</h4>
                      <p className="text-xs text-text-muted mt-1 truncate">
                        {metadata?.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeIndicator(index);
                        }}
                        className="p-2 text-danger-500 hover:bg-danger-500/10 rounded-lg touch-manipulation"
                        aria-label="Remove indicator"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && metadata && (
                    <div className="px-4 pb-4 border-t border-border-default pt-4 space-y-4">
                      {/* Parameters */}
                      {Object.entries(metadata.parameters).map(([paramName, param]: [string, any]) => (
                        <div key={paramName}>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            {paramName}
                            <span className="text-xs text-text-muted ml-1">({param.description})</span>
                          </label>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              min={param.min}
                              max={param.max}
                              step={param.type === 'float' ? 0.1 : 1}
                              value={indicator.params[paramName] ?? param.default}
                              onChange={(e) =>
                                updateIndicatorParams(
                                  index,
                                  paramName,
                                  param.type === 'float'
                                    ? parseFloat(e.target.value) || param.default
                                    : parseInt(e.target.value) || param.default
                                )
                              }
                              className="text-base" // Larger text for mobile
                            />
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.type === 'float' ? 0.1 : 1}
                              value={indicator.params[paramName] ?? param.default}
                              onChange={(e) =>
                                updateIndicatorParams(
                                  index,
                                  paramName,
                                  param.type === 'float'
                                    ? parseFloat(e.target.value)
                                    : parseInt(e.target.value)
                                )
                              }
                              className="w-full h-2 touch-manipulation"
                            />
                            <div className="flex justify-between text-xs text-text-muted">
                              <span>{param.min}</span>
                              <span>{param.max}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Available Conditions */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Available Conditions
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {Object.entries(metadata.conditions).map(([conditionName, description]) => (
                            <button
                              key={conditionName}
                              onClick={() => addConditionToExpression(conditionName)}
                              className="p-3 text-left bg-bg-tertiary rounded-lg border border-border-default hover:border-primary-500/50 transition-colors touch-manipulation"
                            >
                              <div className="font-medium text-sm text-text-primary">{conditionName}</div>
                              <div className="text-xs text-text-muted mt-1">{description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expression Builder */}
      {selectedIndicators.length > 0 && (
        <div className="bg-bg-secondary rounded-lg border border-border-default p-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Strategy Expression
          </label>
          <textarea
            value={expression}
            onChange={(e) => onExpressionChange(e.target.value)}
            placeholder="e.g., rsi_oversold AND macd_cross_up"
            className="w-full px-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary text-base min-h-[100px] resize-none"
          />
          <p className="text-xs text-text-muted mt-2">
            Use AND/OR to combine conditions. Tap conditions above to add them.
          </p>
        </div>
      )}

      {/* Indicator Picker Modal */}
      {showIndicatorPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-bg-secondary w-full max-h-[80vh] rounded-t-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Select Indicator</h3>
              <button
                onClick={() => setShowIndicatorPicker(false)}
                className="p-2 text-text-muted hover:text-text-primary touch-manipulation"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="p-4 border-b border-border-default overflow-x-auto">
              <div className="flex gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                      selectedCategory === category
                        ? 'bg-primary-500 text-white'
                        : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Indicator List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredIndicators.map(([indicatorId, metadata]) => {
                const isSelected = selectedIndicators.some(ind => ind.id === indicatorId);
                return (
                  <button
                    key={indicatorId}
                    onClick={() => !isSelected && addIndicator(indicatorId)}
                    disabled={isSelected}
                    className={`w-full p-4 text-left rounded-lg border transition-colors touch-manipulation ${
                      isSelected
                        ? 'bg-primary-500/20 border-primary-500/50 opacity-50'
                        : 'bg-bg-tertiary border-border-default hover:border-primary-500/50 active:bg-bg-elevated'
                    }`}
                  >
                    <div className="font-semibold text-text-primary">{metadata.name}</div>
                    <div className="text-xs text-text-muted mt-1">{metadata.description}</div>
                    {isSelected && (
                      <div className="text-xs text-primary-400 mt-2">Already added</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

