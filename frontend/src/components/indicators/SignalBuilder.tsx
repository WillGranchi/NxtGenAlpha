/**
 * Signal Builder Component
 * Build custom signal expressions per indicator using visual condition builder
 */

import React from 'react';
import { VisualConditionBuilder } from '../strategy/VisualConditionBuilder';
import type { IndicatorMetadata, IndicatorConfig } from '../../services/api';

interface SignalBuilderProps {
  indicatorId: string;
  indicatorMetadata: IndicatorMetadata;
  expression: string;
  onExpressionChange: (expression: string) => void;
  availableConditions: Record<string, string>;
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
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
  isLoading = false,
}) => {
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

  return (
    <div className="bg-bg-tertiary border border-border-default rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">
            {indicatorMetadata.name} Signal Expression
          </h4>
          <p className="text-xs text-text-muted mt-1">
            {indicatorMetadata.description}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Generate signal when the following conditions are met:
          </p>
        </div>
        <button
          onClick={handleUseDefault}
          disabled={isLoading || !getDefaultCondition()}
          className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-primary-500/10 transition-colors"
        >
          Use Default
        </button>
      </div>

      <VisualConditionBuilder
        expression={expression}
        onExpressionChange={onExpressionChange}
        availableConditions={availableConditions}
        selectedIndicators={selectedIndicators}
        availableIndicators={availableIndicators}
      />
    </div>
  );
};
