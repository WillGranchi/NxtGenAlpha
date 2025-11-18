import React from 'react';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface QuickSummaryProps {
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  expression?: string;
  longExpression?: string;
  cashExpression?: string;
  useSeparateExpressions?: boolean;
  validationStatus?: {
    isValid: boolean;
    errorMessage?: string;
  };
  className?: string;
}

export const QuickSummary: React.FC<QuickSummaryProps> = ({
  selectedIndicators,
  availableIndicators,
  expression,
  longExpression,
  cashExpression,
  useSeparateExpressions = false,
  validationStatus,
  className = ''
}) => {
  if (selectedIndicators.length === 0) {
    return (
      <div className={`bg-bg-secondary border border-border-default rounded-lg p-4 ${className}`}>
        <p className="text-sm text-text-secondary text-center">No indicators selected</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-primary-500/10 to-indigo-500/10 border border-primary-500/30 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-text-primary mb-3">Strategy Summary</h4>
      
      {/* Selected Indicators */}
      <div className="mb-4">
        <div className="text-xs font-medium text-text-secondary mb-2">
          Selected Indicators ({selectedIndicators.length}):
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIndicators.map((indicator) => {
            const metadata = availableIndicators?.[indicator.id];
            const category = metadata?.category || 'Other';
            const categoryColors: Record<string, string> = {
              Momentum: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
              Trend: 'bg-primary-500/20 text-primary-400 border-primary-500/50',
              Volatility: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50',
              Other: 'bg-bg-elevated text-text-secondary border-border-default'
            };
            
            return (
              <div
                key={indicator.id}
                className={`text-xs px-2 py-1 rounded border ${categoryColors[category] || categoryColors.Other}`}
              >
                {metadata?.name || indicator.id}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expression(s) */}
      <div className="space-y-2">
        {useSeparateExpressions ? (
          <>
            <div>
              <div className="text-xs font-medium text-primary-400 mb-1">LONG Expression:</div>
              <div className="text-xs font-code bg-bg-secondary px-2 py-1 rounded border border-primary-500/30 text-text-primary break-all">
                {longExpression || <span className="text-text-muted italic">Not set</span>}
              </div>
            </div>
            {cashExpression && cashExpression.trim() && (
              <div>
                <div className="text-xs font-medium text-warning-400 mb-1">CASH Expression:</div>
                <div className="text-xs font-code bg-bg-secondary px-2 py-1 rounded border border-warning-500/30 text-text-primary break-all">
                  {cashExpression}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="text-xs font-medium text-text-secondary mb-1">Expression:</div>
            <div className="text-xs font-code bg-bg-secondary px-2 py-1 rounded border border-border-default text-text-primary break-all">
              {expression || <span className="text-text-muted italic">Not set</span>}
            </div>
          </div>
        )}
      </div>

      {/* Validation Status */}
      {validationStatus && (expression || longExpression) && (
        <div className="mt-3 pt-3 border-t border-primary-500/30">
          <div className="flex items-center space-x-2">
            {validationStatus.isValid ? (
              <>
                <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium text-success-400">Expression Valid</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium text-danger-400">
                  {validationStatus.errorMessage || 'Invalid Expression'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

