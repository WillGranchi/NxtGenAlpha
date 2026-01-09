/**
 * Component for building custom combination rules for strategies.
 */

import React, { useState, useEffect } from 'react';
import { Sliders, Users, Code } from 'lucide-react';

export type CombinationMethod = 'weighted' | 'majority' | 'custom';

export interface CombinationRule {
  method: CombinationMethod;
  weights?: Record<string, number>;
  threshold?: number;
  expression?: string;
}

interface CustomRulesBuilderProps {
  strategyNames: string[];
  rule: CombinationRule;
  onRuleChange: (rule: CombinationRule) => void;
}

export const CustomRulesBuilder: React.FC<CustomRulesBuilderProps> = ({
  strategyNames,
  rule,
  onRuleChange
}) => {
  const [method, setMethod] = useState<CombinationMethod>(rule.method || 'weighted');
  const [weights, setWeights] = useState<Record<string, number>>(rule.weights || {});
  const [threshold, setThreshold] = useState<number>(rule.threshold ?? 0.5);
  const [expression, setExpression] = useState<string>(rule.expression || '');

  useEffect(() => {
    // Initialize weights with equal distribution
    if (method === 'weighted' && Object.keys(weights).length === 0 && strategyNames.length > 0) {
      const equalWeight = 1.0 / strategyNames.length;
      const initialWeights: Record<string, number> = {};
      strategyNames.forEach(name => {
        initialWeights[name] = equalWeight;
      });
      setWeights(initialWeights);
    }
  }, [method, strategyNames]);

  useEffect(() => {
    // Notify parent of rule changes
    const newRule: CombinationRule = {
      method,
      ...(method === 'weighted' && { weights }),
      ...(method === 'majority' && { threshold }),
      ...(method === 'custom' && { expression })
    };
    onRuleChange(newRule);
  }, [method, weights, threshold, expression]);

  const handleWeightChange = (name: string, value: number) => {
    const newWeights = { ...weights, [name]: Math.max(0, Math.min(1, value)) };
    
    // Normalize weights to sum to 1.0
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      Object.keys(newWeights).forEach(key => {
        newWeights[key] = newWeights[key] / total;
      });
    }
    
    setWeights(newWeights);
  };

  const getTotalWeight = () => {
    return Object.values(weights).reduce((sum, w) => sum + w, 0);
  };

  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Combination Method
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setMethod('weighted')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              method === 'weighted'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border-default hover:border-primary-500/50'
            }`}
          >
            <Sliders className="w-5 h-5 mx-auto mb-2 text-primary-400" />
            <div className="text-sm font-medium text-text-primary">Weighted</div>
            <div className="text-xs text-text-muted mt-1">Average with weights</div>
          </button>
          
          <button
            onClick={() => setMethod('majority')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              method === 'majority'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border-default hover:border-primary-500/50'
            }`}
          >
            <Users className="w-5 h-5 mx-auto mb-2 text-primary-400" />
            <div className="text-sm font-medium text-text-primary">Majority</div>
            <div className="text-xs text-text-muted mt-1">Vote-based</div>
          </button>
          
          <button
            onClick={() => setMethod('custom')}
            className={`p-4 border-2 rounded-lg transition-colors ${
              method === 'custom'
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border-default hover:border-primary-500/50'
            }`}
          >
            <Code className="w-5 h-5 mx-auto mb-2 text-primary-400" />
            <div className="text-sm font-medium text-text-primary">Custom</div>
            <div className="text-xs text-text-muted mt-1">Boolean expression</div>
          </button>
        </div>
      </div>

      {/* Weighted Average Configuration */}
      {method === 'weighted' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              Strategy Weights
            </label>
            <span className={`text-xs ${
              Math.abs(getTotalWeight() - 1.0) < 0.01
                ? 'text-green-400'
                : 'text-yellow-400'
            }`}>
              Total: {(getTotalWeight() * 100).toFixed(1)}%
            </span>
          </div>
          
          {strategyNames.map((name) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-muted truncate flex-1 mr-4">
                  {name}
                </label>
                <span className="text-sm text-text-primary w-16 text-right">
                  {(weights[name] || 0) * 100}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={weights[name] || 0}
                onChange={(e) => handleWeightChange(name, parseFloat(e.target.value))}
                className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>
          ))}
          
          {Math.abs(getTotalWeight() - 1.0) >= 0.01 && (
            <p className="text-xs text-yellow-400">
              Weights should sum to 100%. Adjusting automatically...
            </p>
          )}
        </div>
      )}

      {/* Majority Vote Configuration */}
      {method === 'majority' && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-text-primary">
            Agreement Threshold
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Minimum agreement</span>
              <span className="text-sm text-text-primary">
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <p className="text-xs text-text-muted">
              Strategies must agree at least {(threshold * 100).toFixed(0)}% to generate a signal.
            </p>
          </div>
        </div>
      )}

      {/* Custom Expression Configuration */}
      {method === 'custom' && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-text-primary">
            Boolean Expression
          </label>
          <textarea
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="(indicator == 1 AND valuation == 1) OR fullcycle == 1"
            className="w-full p-3 bg-bg-secondary border border-border-default rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:border-primary-500"
            rows={4}
          />
          <div className="text-xs text-text-muted space-y-1">
            <p>Available operators: AND, OR, ==, !=</p>
            <p>Strategy names: {strategyNames.join(', ')}</p>
            <p>Signal values: 1 (buy), -1 (sell), 0 (hold)</p>
            <p>Example: (indicator == 1 AND valuation == 1) OR fullcycle == 1</p>
          </div>
        </div>
      )}
    </div>
  );
};

