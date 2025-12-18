/**
 * Signal Builder Component
 * Build custom signal expressions per indicator
 */

import React, { useState, useEffect } from 'react';
import { ExpressionBuilder } from '../strategy/ExpressionBuilder';
import type { IndicatorMetadata, IndicatorConfig } from '../../services/api';

interface SignalBuilderProps {
  indicatorId: string;
  indicatorMetadata: IndicatorMetadata;
  expression: string;
  onExpressionChange: (expression: string) => void;
  availableConditions: Record<string, string>;
  isLoading?: boolean;
}

export const SignalBuilder: React.FC<SignalBuilderProps> = ({
  indicatorId,
  indicatorMetadata,
  expression,
  onExpressionChange,
  availableConditions,
  isLoading = false,
}) => {
  const [localExpression, setLocalExpression] = useState(expression);

  useEffect(() => {
    setLocalExpression(expression);
  }, [expression]);

  const handleExpressionChange = (newExpression: string) => {
    setLocalExpression(newExpression);
    onExpressionChange(newExpression);
  };

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
      handleExpressionChange(defaultCondition);
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
        </div>
        <button
          onClick={handleUseDefault}
          disabled={isLoading || !getDefaultCondition()}
          className="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use Default
        </button>
      </div>

      <ExpressionBuilder
        selectedIndicators={[{ id: indicatorId, params: {}, show_on_chart: false }] as IndicatorConfig[]}
        expression={localExpression}
        onExpressionChange={handleExpressionChange}
        availableConditions={Object.keys(availableConditions)}
        onValidate={() => {}}
      />
    </div>
  );
};
