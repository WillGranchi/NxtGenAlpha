/**
 * Strategy Templates Component
 * Provides pre-built strategy templates for common patterns
 */

import React, { useState } from 'react';
import { BookOpen, ChevronRight, Copy } from 'lucide-react';
import type { IndicatorConfig } from '../../services/api';

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Trend Following' | 'Mean Reversion' | 'Momentum' | 'Breakout' | 'Multi-Factor';
  indicators: Array<{ id: string; params: Record<string, any> }>;
  expression: string;
  longExpression?: string;
  cashExpression?: string;
  shortExpression?: string;
  strategyType?: 'long_cash' | 'long_short';
  useSeparateExpressions?: boolean;
}

interface StrategyTemplatesProps {
  onSelectTemplate: (template: StrategyTemplate) => void;
  availableIndicators: Record<string, any> | null;
  className?: string;
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'golden-cross',
    name: 'Golden Cross',
    description: 'Classic trend-following strategy using SMA crossover',
    category: 'Trend Following',
    indicators: [
      { id: 'SMA', params: { period: 50 } },
      { id: 'SMA', params: { period: 200 } }
    ],
    expression: 'sma_price_cross_above AND sma_price_cross_above',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'rsi-mean-reversion',
    name: 'RSI Mean Reversion',
    description: 'Buy oversold, sell overbought using RSI',
    category: 'Mean Reversion',
    indicators: [
      { id: 'RSI', params: { period: 14, oversold: 30, overbought: 70 } }
    ],
    expression: 'rsi_cross_above_oversold',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'macd-trend',
    name: 'MACD Trend',
    description: 'Follow MACD crossover signals',
    category: 'Trend Following',
    indicators: [
      { id: 'MACD', params: { fast: 12, slow: 26, signal: 9 } }
    ],
    expression: 'macd_cross_up',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'rsi-macd-combo',
    name: 'RSI + MACD Combo',
    description: 'Combine RSI and MACD for confirmation',
    category: 'Multi-Factor',
    indicators: [
      { id: 'RSI', params: { period: 14, oversold: 30, overbought: 70 } },
      { id: 'MACD', params: { fast: 12, slow: 26, signal: 9 } }
    ],
    expression: 'rsi_cross_above_oversold AND macd_cross_up',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'bollinger-squeeze',
    name: 'Bollinger Squeeze',
    description: 'Trade breakouts from low volatility periods',
    category: 'Breakout',
    indicators: [
      { id: 'Bollinger', params: { window: 20, num_std: 2 } }
    ],
    expression: 'bb_price_squeeze',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'stochastic-momentum',
    name: 'Stochastic Momentum',
    description: 'Use Stochastic oscillator for momentum signals',
    category: 'Momentum',
    indicators: [
      { id: 'Stochastic', params: { k_period: 14, d_period: 3, oversold: 20, overbought: 80 } }
    ],
    expression: 'stoch_k_cross_above_d AND stoch_oversold',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'ichimoku-trend',
    name: 'Ichimoku Cloud',
    description: 'Comprehensive trend-following with Ichimoku',
    category: 'Trend Following',
    indicators: [
      { id: 'Ichimoku', params: { tenkan_period: 9, kijun_period: 26, senkou_b_period: 52, displacement: 26 } }
    ],
    expression: 'ichimoku_price_above_cloud AND ichimoku_tenkan_above_kijun',
    strategyType: 'long_cash',
    useSeparateExpressions: false,
  },
  {
    id: 'long-short-adx',
    name: 'Long/Short ADX',
    description: 'Long/Short strategy based on ADX trend strength',
    category: 'Trend Following',
    indicators: [
      { id: 'ADX', params: { period: 14, strong_trend: 25 } },
      { id: 'EMA_Cross', params: { fast_period: 12, slow_period: 26 } }
    ],
    longExpression: 'adx_strong_trend AND ema_cross_up',
    shortExpression: 'adx_strong_trend AND ema_cross_down',
    strategyType: 'long_short',
    useSeparateExpressions: true,
  },
];

export const StrategyTemplates: React.FC<StrategyTemplatesProps> = ({
  onSelectTemplate,
  availableIndicators,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(STRATEGY_TEMPLATES.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'All'
    ? STRATEGY_TEMPLATES
    : STRATEGY_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: StrategyTemplate) => {
    // Check if all required indicators are available
    const missingIndicators = template.indicators.filter(
      ind => !availableIndicators || !availableIndicators[ind.id]
    );

    if (missingIndicators.length > 0) {
      alert(`Template requires indicators that are not available: ${missingIndicators.map(i => i.id).join(', ')}`);
      return;
    }

    onSelectTemplate(template);
  };

  return (
    <div className={`bg-bg-secondary border border-border-default rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-text-primary">Strategy Templates</h3>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        Start with a pre-built strategy template and customize it to your needs
      </p>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-primary-500 text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="space-y-3">
        {filteredTemplates.map((template) => {
          const isExpanded = expandedTemplate === template.id;
          
          return (
            <div
              key={template.id}
              className="border border-border-default rounded-lg overflow-hidden hover:border-primary-500/50 transition-colors"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-text-primary">{template.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-text-secondary">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{template.description}</p>
                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <span className="text-xs font-semibold text-text-secondary">Indicators: </span>
                          <span className="text-xs text-text-muted">
                            {template.indicators.map(ind => ind.id).join(', ')}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-text-secondary">Expression: </span>
                          <code className="text-xs text-text-primary bg-bg-tertiary px-2 py-1 rounded">
                            {template.useSeparateExpressions 
                              ? `LONG: ${template.longExpression} | SHORT: ${template.shortExpression}`
                              : template.expression}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(template);
                      }}
                      className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                      Use Template
                    </button>
                    <ChevronRight
                      className={`w-5 h-5 text-text-muted transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          No templates found in this category
        </div>
      )}
    </div>
  );
};

