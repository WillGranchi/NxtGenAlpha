import React, { useState, useMemo } from 'react';
import type { IndicatorConfig } from '../../services/api';

interface ExpressionTemplate {
  name: string;
  description: string;
  category: 'Momentum' | 'Trend' | 'Multi-Indicator' | 'Common';
  expression: string;
  example: string;
}

interface ExpressionTemplatesProps {
  availableConditions: string[];
  selectedIndicators: IndicatorConfig[];
  onSelectTemplate: (expression: string) => void;
  className?: string;
}

const EXPRESSION_TEMPLATES: ExpressionTemplate[] = [
  {
    name: 'RSI Oversold',
    description: 'Buy when RSI is oversold',
    category: 'Momentum',
    expression: 'rsi_oversold',
    example: 'Simple momentum strategy'
  },
  {
    name: 'RSI Oversold + MACD Cross',
    description: 'Buy when RSI is oversold AND MACD crosses up',
    category: 'Multi-Indicator',
    expression: 'rsi_oversold AND macd_cross_up',
    example: 'Momentum + Trend confirmation'
  },
  {
    name: 'EMA Cross Up',
    description: 'Buy when fast EMA crosses above slow EMA',
    category: 'Trend',
    expression: 'ema_cross_up',
    example: 'Trend-following strategy'
  },
  {
    name: 'MACD Cross Up',
    description: 'Buy when MACD line crosses above signal line',
    category: 'Trend',
    expression: 'macd_cross_up',
    example: 'MACD momentum strategy'
  },
  {
    name: 'Price Above SMA',
    description: 'Buy when price is above moving average',
    category: 'Trend',
    expression: 'sma_price_above',
    example: 'Simple trend strategy'
  },
  {
    name: 'RSI Oversold OR EMA Cross',
    description: 'Buy when RSI is oversold OR EMA crosses up',
    category: 'Multi-Indicator',
    expression: '(rsi_oversold OR ema_cross_up)',
    example: 'Multiple entry signals'
  },
  {
    name: 'RSI Oversold AND EMA Above',
    description: 'Buy when RSI is oversold AND price is above EMA',
    category: 'Multi-Indicator',
    expression: 'rsi_oversold AND ema_price_above',
    example: 'Momentum + Trend combination'
  },
  {
    name: 'Complex Multi-Signal',
    description: 'Buy when (RSI oversold AND MACD cross) OR EMA cross',
    category: 'Multi-Indicator',
    expression: '(rsi_oversold AND macd_cross_up) OR ema_cross_up',
    example: 'Sophisticated multi-factor strategy'
  },
];

export const ExpressionTemplates: React.FC<ExpressionTemplatesProps> = ({
  availableConditions,
  selectedIndicators,
  onSelectTemplate,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Filter templates by category and available conditions
  const filteredTemplates = useMemo(() => {
    return EXPRESSION_TEMPLATES.filter(template => {
      // Check if category matches
      if (selectedCategory !== 'All' && template.category !== selectedCategory) {
        return false;
      }

      // Check if template uses only available conditions
      const templateWords = template.expression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      const availableWords = ['AND', 'OR', ...availableConditions];
      
      return templateWords.every(word => 
        availableWords.includes(word) || 
        availableWords.includes(word.toLowerCase())
      );
    });
  }, [availableConditions, selectedCategory]);

  const categories = ['All', ...Array.from(new Set(EXPRESSION_TEMPLATES.map(t => t.category)))];

  if (selectedIndicators.length === 0) {
    return (
      <div className={`bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-primary-400">
          Add indicators to see expression templates
        </p>
      </div>
    );
  }

  return (
    <div className={`card p-4 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-text-primary mb-2">Expression Templates</h4>
        <p className="text-xs text-text-secondary mb-3">
          Click a template to insert it into your expression builder
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            No templates available for selected indicators
          </p>
        ) : (
          filteredTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => onSelectTemplate(template.expression)}
              className="w-full text-left p-3 border border-border-default rounded-lg hover:border-primary-500/50 hover:bg-primary-500/10 transition-colors group"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-text-primary group-hover:text-primary-400">
                      {template.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-bg-elevated text-text-secondary rounded">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">{template.description}</p>
                </div>
              </div>
              <code className="block text-xs text-primary-400 font-code bg-bg-secondary px-2 py-1 rounded border border-primary-500/30 group-hover:bg-primary-500/10">
                {template.expression}
              </code>
              {template.example && (
                <p className="text-xs text-text-muted mt-1 italic">{template.example}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};


