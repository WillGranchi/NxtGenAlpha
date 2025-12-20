/**
 * Parameter Editor Component
 * Edit indicator parameters (lengths, thresholds, etc.)
 */

import React from 'react';
import { Input } from '../ui/Input';
import type { IndicatorMetadata } from '../../services/api';

interface ParameterEditorProps {
  indicatorMetadata: IndicatorMetadata;
  parameters: Record<string, any>;
  onParametersChange: (params: Record<string, any>) => void;
  isLoading?: boolean;
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({
  indicatorMetadata,
  parameters,
  onParametersChange,
  isLoading = false,
}) => {
  const handleParameterChange = (paramName: string, value: number) => {
    const newParams = { ...parameters, [paramName]: value };
    onParametersChange(newParams);
  };

  if (!indicatorMetadata.parameters || Object.keys(indicatorMetadata.parameters).length === 0) {
    return (
      <div className="bg-bg-tertiary border border-border-default rounded-lg p-6">
        <div className="text-center text-text-muted">
          <p>This indicator has no configurable parameters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-tertiary border border-border-default rounded-lg p-4 md:p-6">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-text-primary mb-1">Indicator Parameters</h4>
        <p className="text-sm text-text-secondary">
          Adjust the parameters for {indicatorMetadata.name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(indicatorMetadata.parameters).map(([paramName, paramConfig]: [string, any]) => {
          const currentValue = parameters[paramName] ?? paramConfig.default;
          const min = paramConfig.min ?? 0;
          const max = paramConfig.max ?? 1000;
          const step = paramConfig.step ?? 1;

          return (
            <div key={paramName} className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                {paramName}
                {paramConfig.description && (
                  <span className="text-xs text-text-muted ml-2">({paramConfig.description})</span>
                )}
              </label>
              
              {/* Range Slider */}
              {paramConfig.min !== undefined && paramConfig.max !== undefined ? (
                <div className="space-y-2">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentValue}
                    onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value))}
                    disabled={isLoading}
                    className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{min}</span>
                    <span className="font-medium text-text-primary">{currentValue}</span>
                    <span>{max}</span>
                  </div>
                </div>
              ) : (
                /* Number Input */
                <Input
                  type="number"
                  value={currentValue}
                  onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value) || paramConfig.default)}
                  min={min}
                  max={max}
                  step={step}
                  disabled={isLoading}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
