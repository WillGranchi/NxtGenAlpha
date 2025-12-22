/**
 * Signal Builder Component
 * Build custom signal expressions per indicator using visual condition builder
 */

import React, { useState } from 'react';
import { VisualConditionBuilder } from '../strategy/VisualConditionBuilder';
import { Input } from '../ui/Input';
import type { IndicatorMetadata, IndicatorConfig } from '../../services/api';

interface SignalBuilderProps {
  indicatorId: string;
  indicatorMetadata: IndicatorMetadata;
  expression: string;
  onExpressionChange: (expression: string) => void;
  availableConditions: Record<string, string>;
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  indicatorParameters: Record<string, any>;
  onParametersChange: (indicatorId: string, parameters: Record<string, any>) => void;
  isLoading?: boolean;
}

export const SignalBuilder: React.FC<SignalBuilderProps> = ({
  indicatorId,
  indicatorMetadata,
  expression,
  onExpressionChange,
  availableConditions,
  selectedIndicators,
  availableIndicators,
  indicatorParameters,
  onParametersChange,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get default condition for this indicator
  const getDefaultCondition = () => {
    const indicatorConditions = Object.keys(availableConditions).filter((cond) =>
      cond.toLowerCase().startsWith(indicatorId.toLowerCase())
    );
    return indicatorConditions[0] || '';
  };

  const handleUseDefault = () => {
    const defaultCondition = getDefaultCondition();
    if (defaultCondition) {
      onExpressionChange(defaultCondition);
    }
  };

  const handleParameterChange = (paramName: string, value: number) => {
    const newParams = { ...indicatorParameters, [paramName]: value };
    onParametersChange(indicatorId, newParams);
  };

  return (
    <div className="bg-bg-tertiary border border-border-default rounded-lg p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-text-primary">
            {indicatorMetadata.name} Signal Expression
          </h4>
          <p className="text-sm text-text-muted mt-1">
            {indicatorMetadata.description}
          </p>
          <p className="text-sm text-text-secondary mt-2">
            Generate signal when the following conditions are met:
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-elevated transition-colors"
          >
            {isExpanded ? 'Hide' : 'Show'} Parameters
          </button>
          <button
            onClick={handleUseDefault}
            disabled={isLoading || !getDefaultCondition()}
            className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-primary-500/10 transition-colors"
          >
            Use Default
          </button>
        </div>
      </div>

      {/* Indicator Parameters */}
      {isExpanded && Object.keys(indicatorMetadata.parameters || {}).length > 0 && (
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-3">
          <h5 className="text-xs font-semibold text-text-primary mb-2">Indicator Parameters</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(indicatorMetadata.parameters).map(([paramName, paramConfig]: [string, any]) => (
              <div key={paramName}>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {paramName}
                  <span className="text-xs text-text-muted ml-1">({paramConfig.description})</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={paramConfig.min}
                    max={paramConfig.max}
                    step={paramConfig.type === 'float' ? 0.1 : 1}
                    value={indicatorParameters[paramName] ?? paramConfig.default}
                    onChange={(e) => {
                      const value = paramConfig.type === 'float' 
                        ? parseFloat(e.target.value) || paramConfig.default
                        : parseInt(e.target.value) || paramConfig.default;
                      handleParameterChange(paramName, value);
                    }}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min={paramConfig.min}
                    max={paramConfig.max}
                    step={paramConfig.type === 'float' ? 0.1 : 1}
                    value={indicatorParameters[paramName] ?? paramConfig.default}
                    onChange={(e) => {
                      const value = paramConfig.type === 'float'
                        ? parseFloat(e.target.value)
                        : parseInt(e.target.value);
                      handleParameterChange(paramName, value);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Condition Builder */}
      <div>
        <VisualConditionBuilder
          expression={expression}
          onExpressionChange={onExpressionChange}
          availableConditions={availableConditions}
          selectedIndicators={selectedIndicators}
          availableIndicators={availableIndicators}
        />
      </div>
    </div>
  );
};
