/**
 * Indicator Parameter Controls Component
 * Expandable sections for editing indicator parameters
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FullCycleIndicator } from '../../hooks/useFullCycle';

interface IndicatorParameterControlsProps {
  indicator: FullCycleIndicator;
  parameters: Record<string, number>;
  onParameterChange: (indicatorId: string, paramName: string, value: number) => void;
  isLoading?: boolean;
}

export const IndicatorParameterControls: React.FC<IndicatorParameterControlsProps> = ({
  indicator,
  parameters,
  onParameterChange,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get current parameter values (use custom if set, otherwise default)
  const getParamValue = (paramName: string): number => {
    return parameters[paramName] ?? indicator.default_params[paramName] ?? 0;
  };

  // Group parameters by type
  const lengthParams: string[] = [];
  const meanParams: string[] = [];
  const scaleParams: string[] = [];

  Object.keys(indicator.default_params).forEach((paramName) => {
    if (paramName.includes('len') || paramName.includes('length') || paramName.includes('lambda')) {
      lengthParams.push(paramName);
    } else if (paramName.includes('mn') || paramName.includes('mean')) {
      meanParams.push(paramName);
    } else if (paramName.includes('scl') || paramName.includes('scale') || paramName.includes('cl')) {
      scaleParams.push(paramName);
    } else {
      // Default to length if unclear
      lengthParams.push(paramName);
    }
  });

  const handleParamChange = (paramName: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onParameterChange(indicator.id, paramName, numValue);
    }
  };

  const renderParamInput = (paramName: string, label: string) => {
    const value = getParamValue(paramName);
    const defaultValue = indicator.default_params[paramName] ?? 0;

    return (
      <div key={paramName} className="flex items-center gap-3">
        <label className="text-sm text-text-secondary w-32">{label}:</label>
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
          className="flex-1 px-3 py-1.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isLoading}
        />
        {value !== defaultValue && (
          <button
            onClick={() => handleParamChange(paramName, defaultValue.toString())}
            className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1"
            title="Reset to default"
          >
            Reset
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-bg-tertiary hover:bg-bg-tertiary/80 transition-colors"
        disabled={isLoading}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{indicator.name}</span>
          {Object.keys(parameters).length > 0 && (
            <span className="text-xs text-primary-400 bg-primary-500/20 px-2 py-0.5 rounded">
              Custom
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      <div className={`transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {isExpanded && (
          <div className="p-4 bg-bg-secondary space-y-4">
          {lengthParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                Length Parameters
              </h4>
              <div className="space-y-2">
                {lengthParams.map((paramName) =>
                  renderParamInput(paramName, paramName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()))
                )}
              </div>
            </div>
          )}

          {meanParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                Mean Parameters
              </h4>
              <div className="space-y-2">
                {meanParams.map((paramName) =>
                  renderParamInput(paramName, paramName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()))
                )}
              </div>
            </div>
          )}

          {scaleParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                Scale Parameters
              </h4>
              <div className="space-y-2">
                {scaleParams.map((paramName) =>
                  renderParamInput(paramName, paramName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()))
                )}
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

