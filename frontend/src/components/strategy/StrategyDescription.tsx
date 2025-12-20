/**
 * Natural language strategy description component
 * Converts strategy expressions to human-readable descriptions with actual parameter values
 */

import React, { useMemo } from 'react';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface StrategyDescriptionProps {
  expression?: string;
  longExpression?: string;
  cashExpression?: string;
  shortExpression?: string;
  useSeparateExpressions?: boolean;
  strategyType?: 'long_cash' | 'long_short';
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  availableConditions: Record<string, string>;
}

export const StrategyDescription: React.FC<StrategyDescriptionProps> = ({
  expression = '',
  longExpression = '',
  cashExpression = '',
  shortExpression = '',
  useSeparateExpressions = false,
  strategyType = 'long_cash',
  selectedIndicators,
  availableIndicators,
  availableConditions,
}) => {
  // Find indicator for a condition name
  const findIndicatorForCondition = (conditionName: string): IndicatorConfig | null => {
    if (!availableIndicators) return null;
    
    for (const indicator of selectedIndicators) {
      const metadata = availableIndicators[indicator.id];
      if (metadata?.conditions && conditionName in metadata.conditions) {
        return indicator;
      }
    }
    
    return null;
  };

  // Get parameter value for a condition
  const getParameterValue = (conditionName: string, paramKey: string): number | null => {
    const indicator = findIndicatorForCondition(conditionName);
    if (!indicator || !indicator.params) return null;
    return indicator.params[paramKey] ?? null;
  };

  // Convert condition name to natural language with actual parameter values
  const conditionToNaturalLanguage = (conditionName: string): string => {
    const indicator = findIndicatorForCondition(conditionName);
    if (!indicator || !availableIndicators?.[indicator.id]) {
      return conditionName;
    }

    const metadata = availableIndicators[indicator.id];
    const params = indicator.params;

    // RSI conditions
    if (conditionName.startsWith('rsi_')) {
      const oversold = getParameterValue(conditionName, 'oversold') ?? 30;
      const overbought = getParameterValue(conditionName, 'overbought') ?? 70;
      const period = getParameterValue(conditionName, 'period') ?? 14;

      if (conditionName === 'rsi_oversold') {
        return `RSI(${period}) is below ${oversold} (oversold)`;
      }
      if (conditionName === 'rsi_overbought') {
        return `RSI(${period}) is above ${overbought} (overbought)`;
      }
      if (conditionName === 'rsi_cross_above_oversold') {
        return `RSI(${period}) crosses above ${oversold}`;
      }
      if (conditionName === 'rsi_cross_below_overbought') {
        return `RSI(${period}) crosses below ${overbought}`;
      }
    }

    // MACD conditions
    if (conditionName.startsWith('macd_')) {
      const fast = getParameterValue(conditionName, 'fast') ?? 12;
      const slow = getParameterValue(conditionName, 'slow') ?? 26;
      const signal = getParameterValue(conditionName, 'signal') ?? 9;

      if (conditionName === 'macd_cross_up') {
        return `MACD(${fast},${slow},${signal}) crosses above signal line`;
      }
      if (conditionName === 'macd_cross_down') {
        return `MACD(${fast},${slow},${signal}) crosses below signal line`;
      }
      if (conditionName === 'macd_above_signal') {
        return `MACD(${fast},${slow},${signal}) is above signal line`;
      }
      if (conditionName === 'macd_below_signal') {
        return `MACD(${fast},${slow},${signal}) is below signal line`;
      }
      if (conditionName === 'macd_above_zero') {
        return `MACD(${fast},${slow},${signal}) is above zero`;
      }
      if (conditionName === 'macd_below_zero') {
        return `MACD(${fast},${slow},${signal}) is below zero`;
      }
    }

    // SMA conditions
    if (conditionName.startsWith('sma_')) {
      const period = getParameterValue(conditionName, 'period') ?? 20;

      if (conditionName === 'sma_price_above') {
        return `Price is above SMA(${period})`;
      }
      if (conditionName === 'sma_price_below') {
        return `Price is below SMA(${period})`;
      }
      if (conditionName === 'sma_price_cross_above') {
        return `Price crosses above SMA(${period})`;
      }
      if (conditionName === 'sma_price_cross_below') {
        return `Price crosses below SMA(${period})`;
      }
    }

    // EMA conditions
    if (conditionName.startsWith('ema_price_')) {
      const period = getParameterValue(conditionName, 'period') ?? 20;

      if (conditionName === 'ema_price_above') {
        return `Price is above EMA(${period})`;
      }
      if (conditionName === 'ema_price_below') {
        return `Price is below EMA(${period})`;
      }
      if (conditionName === 'ema_price_cross_above') {
        return `Price crosses above EMA(${period})`;
      }
      if (conditionName === 'ema_price_cross_below') {
        return `Price crosses below EMA(${period})`;
      }
    }

    // EMA Cross conditions
    if (conditionName.startsWith('ema_')) {
      const fastPeriod = getParameterValue(conditionName, 'fast_period') ?? 12;
      const slowPeriod = getParameterValue(conditionName, 'slow_period') ?? 26;

      if (conditionName === 'ema_cross_up') {
        return `EMA(${fastPeriod}) crosses above EMA(${slowPeriod})`;
      }
      if (conditionName === 'ema_cross_down') {
        return `EMA(${fastPeriod}) crosses below EMA(${slowPeriod})`;
      }
      if (conditionName === 'ema_fast_gt_slow') {
        return `EMA(${fastPeriod}) is above EMA(${slowPeriod})`;
      }
      if (conditionName === 'ema_slow_gt_fast') {
        return `EMA(${slowPeriod}) is above EMA(${fastPeriod})`;
      }
    }

    // Bollinger Bands conditions
    if (conditionName.startsWith('bb_')) {
      const window = getParameterValue(conditionName, 'window') ?? 20;
      const numStd = getParameterValue(conditionName, 'num_std') ?? 2.0;

      if (conditionName === 'bb_price_above_upper') {
        return `Price is above upper Bollinger Band(${window}, ${numStd})`;
      }
      if (conditionName === 'bb_price_below_lower') {
        return `Price is below lower Bollinger Band(${window}, ${numStd})`;
      }
      if (conditionName === 'bb_price_touch_upper') {
        return `Price touches upper Bollinger Band(${window}, ${numStd})`;
      }
      if (conditionName === 'bb_price_touch_lower') {
        return `Price touches lower Bollinger Band(${window}, ${numStd})`;
      }
      if (conditionName === 'bb_price_squeeze') {
        return `Bollinger Bands(${window}, ${numStd}) squeeze (low volatility)`;
      }
    }

    // Fallback to metadata description if available
    if (metadata.conditions && conditionName in metadata.conditions) {
      let desc = metadata.conditions[conditionName];
      // Try to replace parameter placeholders with actual values
      Object.entries(params).forEach(([key, value]) => {
        desc = desc.replace(new RegExp(`\\b${key}\\b`, 'gi'), String(value));
      });
      return desc;
    }

    return conditionName;
  };

  // Parse expression to natural language
  const expressionToNaturalLanguage = (expr: string): string => {
    if (!expr.trim()) return '';

    // Split by AND/OR while preserving them
    const parts = expr.split(/\s+(AND|OR)\s+/i);
    const result: string[] = [];
    let lastOperator: 'AND' | 'OR' | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      // Check if it's an operator
      if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
        lastOperator = part.toUpperCase() as 'AND' | 'OR';
        continue;
      }

      // Remove parentheses
      const cleanPart = part.replace(/[()]/g, '').trim();

      // Find matching condition
      const conditionName = Object.keys(availableConditions).find(
        cond => cond === cleanPart || cond.toLowerCase() === cleanPart.toLowerCase()
      );

      if (conditionName) {
        const naturalLang = conditionToNaturalLanguage(conditionName);
        
        // Add operator before this condition (except first)
        if (lastOperator && result.length > 0) {
          result.push(lastOperator.toLowerCase());
        }
        
        result.push(naturalLang);
        lastOperator = null;
      }
    }

    if (result.length === 0) return '';

    // Capitalize first letter
    result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);

    return result.join(' ');
  };

  // Generate description based on expression type
  const description = useMemo(() => {
    try {
      if (useSeparateExpressions) {
        const parts: string[] = [];

        if (longExpression.trim()) {
          const longDesc = expressionToNaturalLanguage(longExpression);
          if (longDesc && typeof longDesc === 'string') {
            parts.push(`Goes LONG when ${longDesc.toLowerCase()}`);
          }
        }

        if (strategyType === 'long_cash') {
          if (cashExpression.trim()) {
            const cashDesc = expressionToNaturalLanguage(cashExpression);
            if (cashDesc && typeof cashDesc === 'string') {
              parts.push(`Goes to CASH when ${cashDesc.toLowerCase()}`);
            }
          } else if (longExpression.trim()) {
            parts.push('Goes to CASH when LONG conditions are false');
          }
        } else if (strategyType === 'long_short') {
          if (shortExpression.trim()) {
            const shortDesc = expressionToNaturalLanguage(shortExpression);
            if (shortDesc && typeof shortDesc === 'string') {
              parts.push(`Goes SHORT when ${shortDesc.toLowerCase()}`);
            }
          }
        }

        return parts.length > 0 ? parts.join('. ') + '.' : 'No strategy conditions defined.';
      } else {
        if (expression.trim()) {
          const desc = expressionToNaturalLanguage(expression);
          return (desc && typeof desc === 'string') ? `Strategy goes long when ${desc.toLowerCase()}` : 'No strategy conditions defined.';
        }
        return 'No strategy conditions defined.';
      }
    } catch (error) {
      console.error('Error generating strategy description:', error);
      return 'No strategy conditions defined.';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, longExpression, cashExpression, shortExpression, useSeparateExpressions, strategyType, availableConditions, selectedIndicators, availableIndicators]);

  if (!description || description === 'No strategy conditions defined.') {
    return (
      <div className="p-4 bg-bg-tertiary border border-border-default rounded-lg">
        <p className="text-sm text-text-muted italic">No strategy conditions defined. Add indicators and build your expression above.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
      <div className="text-xs font-semibold text-primary-400 mb-2 uppercase tracking-wide">
        Strategy Logic
      </div>
      <div className="text-sm text-text-primary font-medium leading-relaxed">
        {description}
      </div>
    </div>
  );
};

