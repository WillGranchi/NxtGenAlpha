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
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-gray-500 text-center">No indicators selected</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Strategy Summary</h4>
      
      {/* Selected Indicators */}
      <div className="mb-4">
        <div className="text-xs font-medium text-gray-700 mb-2">
          Selected Indicators ({selectedIndicators.length}):
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIndicators.map((indicator) => {
            const metadata = availableIndicators?.[indicator.id];
            const category = metadata?.category || 'Other';
            const categoryColors: Record<string, string> = {
              Momentum: 'bg-purple-100 text-purple-700 border-purple-300',
              Trend: 'bg-blue-100 text-blue-700 border-blue-300',
              Volatility: 'bg-orange-100 text-orange-700 border-orange-300',
              Other: 'bg-gray-100 text-gray-700 border-gray-300'
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
              <div className="text-xs font-medium text-blue-900 mb-1">LONG Expression:</div>
              <div className="text-xs font-mono bg-white px-2 py-1 rounded border border-blue-200 text-gray-800 break-all">
                {longExpression || <span className="text-gray-400 italic">Not set</span>}
              </div>
            </div>
            {cashExpression && cashExpression.trim() && (
              <div>
                <div className="text-xs font-medium text-orange-900 mb-1">CASH Expression:</div>
                <div className="text-xs font-mono bg-white px-2 py-1 rounded border border-orange-200 text-gray-800 break-all">
                  {cashExpression}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Expression:</div>
            <div className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-300 text-gray-800 break-all">
              {expression || <span className="text-gray-400 italic">Not set</span>}
            </div>
          </div>
        )}
      </div>

      {/* Validation Status */}
      {validationStatus && (expression || longExpression) && (
        <div className="mt-3 pt-3 border-t border-blue-300">
          <div className="flex items-center space-x-2">
            {validationStatus.isValid ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium text-green-700">Expression Valid</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium text-red-700">
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

