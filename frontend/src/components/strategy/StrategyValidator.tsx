/**
 * Comprehensive Strategy Validator Component
 * Provides pre-flight checks, smart suggestions, and contextual help
 */

import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface ValidationIssue {
  type: 'error' | 'warning' | 'info' | 'suggestion';
  message: string;
  suggestion?: string;
  field?: string;
}

interface StrategyValidatorProps {
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  expression: string;
  longExpression?: string;
  cashExpression?: string;
  shortExpression?: string;
  useSeparateExpressions?: boolean;
  strategyType?: 'long_cash' | 'long_short';
  initialCapital?: number;
  startDate?: string;
  endDate?: string;
  className?: string;
}

export const StrategyValidator: React.FC<StrategyValidatorProps> = ({
  selectedIndicators,
  availableIndicators,
  expression,
  longExpression = '',
  cashExpression = '',
  shortExpression = '',
  useSeparateExpressions = false,
  strategyType = 'long_cash',
  initialCapital = 10000,
  startDate,
  endDate,
  className = '',
}) => {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  // Comprehensive validation
  const validationIssues = useMemo(() => {
    const issues: ValidationIssue[] = [];

    // Check if indicators are selected
    if (selectedIndicators.length === 0) {
      issues.push({
        type: 'error',
        message: 'No indicators selected',
        suggestion: 'Add at least one indicator from the library to build your strategy',
        field: 'indicators',
      });
      return issues; // Early return - can't validate further without indicators
    }

    // Check if expression is defined
    const activeExpression = useSeparateExpressions ? longExpression : expression;
    if (!activeExpression || !activeExpression.trim()) {
      issues.push({
        type: 'error',
        message: 'No strategy expression defined',
        suggestion: useSeparateExpressions
          ? 'Define your LONG expression to specify when to enter long positions'
          : 'Build an expression using conditions from your selected indicators',
        field: 'expression',
      });
    }

    // Check for separate expressions if using that mode
    if (useSeparateExpressions) {
      if (!longExpression || !longExpression.trim()) {
        issues.push({
          type: 'error',
          message: 'LONG expression is required',
          suggestion: 'Define when to go LONG using indicator conditions',
          field: 'longExpression',
        });
      }

      if (strategyType === 'long_short') {
        if (!shortExpression || !shortExpression.trim()) {
          issues.push({
            type: 'error',
            message: 'SHORT expression is required for Long/Short strategy',
            suggestion: 'Define when to go SHORT using indicator conditions',
            field: 'shortExpression',
          });
        }
      }
    }

    // Check for conflicting conditions (e.g., RSI oversold AND RSI overbought)
    if (activeExpression) {
      const conditions = activeExpression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      const uniqueConditions = [...new Set(conditions.filter(c => c.toUpperCase() !== 'AND' && c.toUpperCase() !== 'OR'))];
      
      // Check for contradictory conditions from same indicator
      const conditionsByIndicator = new Map<string, string[]>();
      uniqueConditions.forEach(cond => {
        for (const indicator of selectedIndicators) {
          const metadata = availableIndicators?.[indicator.id];
          if (metadata?.conditions && cond in metadata.conditions) {
            if (!conditionsByIndicator.has(indicator.id)) {
              conditionsByIndicator.set(indicator.id, []);
            }
            conditionsByIndicator.get(indicator.id)!.push(cond);
            break;
          }
        }
      });

      // Check for contradictions (e.g., oversold and overbought)
      conditionsByIndicator.forEach((conds, indicatorId) => {
        const hasOversold = conds.some(c => c.includes('oversold'));
        const hasOverbought = conds.some(c => c.includes('overbought'));
        if (hasOversold && hasOverbought) {
          issues.push({
            type: 'warning',
            message: `Conflicting conditions detected for ${availableIndicators?.[indicatorId]?.name || indicatorId}`,
            suggestion: 'Consider using OR logic if you want either condition, or remove one condition',
            field: 'expression',
          });
        }
      });
    }

    // Check initial capital
    if (initialCapital < 1000) {
      issues.push({
        type: 'warning',
        message: 'Initial capital is very low',
        suggestion: 'Consider using at least $1,000 for more realistic backtesting',
        field: 'initialCapital',
      });
    }

    if (initialCapital > 1000000) {
      issues.push({
        type: 'info',
        message: 'Very high initial capital',
        suggestion: 'Large capital amounts may affect backtest performance calculations',
        field: 'initialCapital',
      });
    }

    // Check date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        issues.push({
          type: 'error',
          message: 'Invalid date range',
          suggestion: 'End date must be after start date',
          field: 'dateRange',
        });
      }

      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 30) {
        issues.push({
          type: 'warning',
          message: 'Very short backtest period',
          suggestion: 'Consider using at least 30 days for meaningful results',
          field: 'dateRange',
        });
      }
    }

    // Check for too many indicators (performance warning)
    if (selectedIndicators.length > 10) {
      issues.push({
        type: 'info',
        message: 'Many indicators selected',
        suggestion: 'Using many indicators may slow down backtesting. Consider simplifying your strategy',
        field: 'indicators',
      });
    }

    // Check for complex expressions (too many conditions)
    if (activeExpression) {
      const conditionCount = (activeExpression.match(/\b(AND|OR)\b/gi) || []).length;
      if (conditionCount > 10) {
        issues.push({
          type: 'warning',
          message: 'Very complex expression',
          suggestion: 'Consider breaking down into simpler sub-expressions or using visual grouping',
          field: 'expression',
        });
      }
    }

    // Suggest improvements
    if (selectedIndicators.length === 1 && activeExpression) {
      issues.push({
        type: 'suggestion',
        message: 'Single indicator strategy',
        suggestion: 'Consider adding complementary indicators (e.g., RSI + MACD) for better signal confirmation',
        field: 'indicators',
      });
    }

    // Check for missing volume indicators when using volume-based indicators
    const hasVolumeIndicator = selectedIndicators.some(ind => 
      ['OBV', 'Volume_SMA'].includes(ind.id)
    );
    if (hasVolumeIndicator) {
      // Check if Volume data is available (this would need to be passed as prop)
      issues.push({
        type: 'info',
        message: 'Volume indicators selected',
        suggestion: 'Ensure your data source includes volume data (Binance data includes volume)',
        field: 'indicators',
      });
    }

    return issues;
  }, [
    selectedIndicators,
    availableIndicators,
    expression,
    longExpression,
    cashExpression,
    shortExpression,
    useSeparateExpressions,
    strategyType,
    initialCapital,
    startDate,
    endDate,
  ]);

  const errors = validationIssues.filter(i => i.type === 'error');
  const warnings = validationIssues.filter(i => i.type === 'warning');
  const suggestions = validationIssues.filter(i => i.type === 'suggestion');
  const infos = validationIssues.filter(i => i.type === 'info');

  const isValid = errors.length === 0;
  const hasWarnings = warnings.length > 0;

  if (validationIssues.length === 0) {
    return (
      <div className={`p-4 bg-success-500/10 border border-success-500/30 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-success-500">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Strategy is valid and ready to backtest</span>
        </div>
      </div>
    );
  }

  const toggleIssue = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  const renderIssue = (issue: ValidationIssue, index: number) => {
    const isExpanded = expandedIssues.has(index);
    const Icon = issue.type === 'error' ? XCircle :
                 issue.type === 'warning' ? AlertTriangle :
                 issue.type === 'suggestion' ? Lightbulb :
                 Info;

    const bgColor = issue.type === 'error' ? 'bg-danger-500/10 border-danger-500/30' :
                    issue.type === 'warning' ? 'bg-warning-500/10 border-warning-500/30' :
                    issue.type === 'suggestion' ? 'bg-primary-500/10 border-primary-500/30' :
                    'bg-info-500/10 border-info-500/30';

    const textColor = issue.type === 'error' ? 'text-danger-500' :
                      issue.type === 'warning' ? 'text-warning-500' :
                      issue.type === 'suggestion' ? 'text-primary-500' :
                      'text-info-500';

    return (
      <div
        key={index}
        className={`p-3 rounded-lg border ${bgColor} cursor-pointer transition-colors hover:opacity-80`}
        onClick={() => toggleIssue(index)}
      >
        <div className="flex items-start gap-2">
          <Icon className={`w-5 h-5 ${textColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <div className={`font-medium ${textColor}`}>{issue.message}</div>
            {issue.suggestion && (
              <div className={`mt-1 text-sm ${isExpanded ? 'block' : 'hidden'}`}>
                <div className="text-text-secondary">{issue.suggestion}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className={`p-4 rounded-lg border ${
        isValid 
          ? 'bg-success-500/10 border-success-500/30' 
          : 'bg-danger-500/10 border-danger-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-success-500" />
            ) : (
              <XCircle className="w-5 h-5 text-danger-500" />
            )}
            <span className={`font-semibold ${
              isValid ? 'text-success-500' : 'text-danger-500'
            }`}>
              {isValid 
                ? 'Strategy is valid' 
                : `${errors.length} error${errors.length !== 1 ? 's' : ''} must be fixed`}
            </span>
          </div>
          {hasWarnings && (
            <span className="text-sm text-warning-500">
              {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-danger-500" />
            Errors ({errors.length})
          </h4>
          <div className="space-y-2">
            {errors.map((issue, idx) => renderIssue(issue, validationIssues.indexOf(issue)))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-500" />
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((issue, idx) => renderIssue(issue, validationIssues.indexOf(issue)))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary-500" />
            Suggestions ({suggestions.length})
          </h4>
          <div className="space-y-2">
            {suggestions.map((issue, idx) => renderIssue(issue, validationIssues.indexOf(issue)))}
          </div>
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-info-500" />
            Information ({infos.length})
          </h4>
          <div className="space-y-2">
            {infos.map((issue, idx) => renderIssue(issue, validationIssues.indexOf(issue)))}
          </div>
        </div>
      )}
    </div>
  );
};

