/**
 * Signal Flow Diagram Component
 * Visualizes the flow: Indicator → Condition → Combined Signal → Position
 */

import React, { useMemo } from 'react';
import { ArrowRight, Circle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface SignalFlowDiagramProps {
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  expression: string;
  availableConditions: Record<string, string>;
  strategyType?: 'long_cash' | 'long_short';
  className?: string;
}

interface FlowNode {
  id: string;
  type: 'indicator' | 'condition' | 'combined' | 'position';
  label: string;
  description?: string;
  status?: 'active' | 'inactive' | 'pending';
}

interface FlowConnection {
  from: string;
  to: string;
  operator?: 'AND' | 'OR';
}

export const SignalFlowDiagram: React.FC<SignalFlowDiagramProps> = ({
  selectedIndicators,
  availableIndicators,
  expression,
  availableConditions,
  strategyType = 'long_cash',
  className = '',
}) => {
  // Parse expression to extract conditions and operators
  const parsedExpression = useMemo(() => {
    if (!expression.trim()) return { conditions: [], operators: [] };

    const parts = expression.split(/\s+(AND|OR)\s+/i);
    const conditions: string[] = [];
    const operators: ('AND' | 'OR')[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      
      if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
        operators.push(part.toUpperCase() as 'AND' | 'OR');
      } else {
        const cleanPart = part.replace(/[()]/g, '').trim();
        if (cleanPart && Object.keys(availableConditions).includes(cleanPart)) {
          conditions.push(cleanPart);
        }
      }
    }

    return { conditions, operators };
  }, [expression, availableConditions]);

  // Build flow nodes
  const flowNodes = useMemo(() => {
    const nodes: FlowNode[] = [];

    // Indicator nodes
    selectedIndicators.forEach((indicator) => {
      const metadata = availableIndicators?.[indicator.id];
      if (metadata) {
        nodes.push({
          id: `indicator-${indicator.id}`,
          type: 'indicator',
          label: metadata.name,
          description: metadata.description,
          status: 'active',
        });
      }
    });

    // Condition nodes (grouped by indicator)
    const conditionsByIndicator = new Map<string, string[]>();
    
    parsedExpression.conditions.forEach((conditionName) => {
      // Find which indicator this condition belongs to
      for (const indicator of selectedIndicators) {
        const metadata = availableIndicators?.[indicator.id];
        if (metadata?.conditions && conditionName in metadata.conditions) {
          if (!conditionsByIndicator.has(indicator.id)) {
            conditionsByIndicator.set(indicator.id, []);
          }
          conditionsByIndicator.get(indicator.id)!.push(conditionName);
          break;
        }
      }
    });

    conditionsByIndicator.forEach((conditions, indicatorId) => {
      conditions.forEach((conditionName) => {
        const description = availableConditions[conditionName] || conditionName;
        nodes.push({
          id: `condition-${conditionName}`,
          type: 'condition',
          label: description,
          description: conditionName,
          status: 'active',
        });
      });
    });

    // Combined signal node
    if (parsedExpression.conditions.length > 0) {
      const expressionParts: string[] = [];
      let conditionIndex = 0;
      
      for (let i = 0; i < parsedExpression.conditions.length; i++) {
        if (i > 0 && parsedExpression.operators[i - 1]) {
          expressionParts.push(parsedExpression.operators[i - 1]);
        }
        expressionParts.push(parsedExpression.conditions[i]);
      }

      nodes.push({
        id: 'combined-signal',
        type: 'combined',
        label: expressionParts.join(' '),
        description: 'Combined signal from all conditions',
        status: 'active',
      });
    }

    // Position node
    const positionLabel = strategyType === 'long_short' 
      ? 'LONG (1) / SHORT (-1) / CASH (0)'
      : 'LONG (1) / CASH (0)';
    
    nodes.push({
      id: 'position',
      type: 'position',
      label: positionLabel,
      description: 'Final trading position',
      status: parsedExpression.conditions.length > 0 ? 'active' : 'pending',
    });

    return nodes;
  }, [selectedIndicators, availableIndicators, parsedExpression, availableConditions, strategyType]);

  // Build connections
  const connections = useMemo(() => {
    const conns: FlowConnection[] = [];

    // Connect indicators to their conditions
    parsedExpression.conditions.forEach((conditionName) => {
      for (const indicator of selectedIndicators) {
        const metadata = availableIndicators?.[indicator.id];
        if (metadata?.conditions && conditionName in metadata.conditions) {
          conns.push({
            from: `indicator-${indicator.id}`,
            to: `condition-${conditionName}`,
          });
          break;
        }
      }
    });

    // Connect conditions to combined signal
    parsedExpression.conditions.forEach((conditionName, index) => {
      conns.push({
        from: `condition-${conditionName}`,
        to: 'combined-signal',
        operator: index > 0 ? parsedExpression.operators[index - 1] : undefined,
      });
    });

    // Connect combined signal to position
    if (parsedExpression.conditions.length > 0) {
      conns.push({
        from: 'combined-signal',
        to: 'position',
      });
    }

    return conns;
  }, [selectedIndicators, availableIndicators, parsedExpression]);

  if (selectedIndicators.length === 0) {
    return (
      <div className={`p-6 bg-bg-secondary border border-border-default rounded-lg ${className}`}>
        <div className="text-center text-text-muted">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Add indicators to see signal flow</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-bg-secondary border border-border-default rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Signal Flow</h3>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 fill-primary-500 text-primary-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 fill-gray-500 text-gray-500" />
            <span>Pending</span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Indicators Layer */}
        <div>
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Indicators
          </h4>
          <div className="flex flex-wrap gap-3">
            {selectedIndicators.map((indicator) => {
              const metadata = availableIndicators?.[indicator.id];
              if (!metadata) return null;
              
              return (
                <div
                  key={`indicator-${indicator.id}`}
                  className="px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-2 h-2 fill-primary-500 text-primary-500" />
                    <span className="text-sm font-medium text-text-primary">{metadata.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conditions Layer */}
        {parsedExpression.conditions.length > 0 && (
          <>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-text-muted" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Conditions
              </h4>
              <div className="flex flex-wrap gap-3">
                {parsedExpression.conditions.map((conditionName, index) => {
                  const description = availableConditions[conditionName] || conditionName;
                  const operator = index > 0 ? parsedExpression.operators[index - 1] : null;
                  
                  return (
                    <React.Fragment key={`condition-${conditionName}`}>
                      {operator && (
                        <div className="flex items-center">
                          <div className={`px-3 py-1 rounded text-xs font-bold ${
                            operator === 'AND' 
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          }`}>
                            {operator}
                          </div>
                        </div>
                      )}
                      <div className="px-4 py-2 bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
                          <span className="text-sm font-medium text-text-primary">{description}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Combined Signal Layer */}
        {parsedExpression.conditions.length > 0 && (
          <>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-text-muted" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Combined Signal
              </h4>
              <div className="px-4 py-3 bg-success-500/10 border border-success-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success-500" />
                  <code className="text-sm font-mono text-text-primary">
                    {parsedExpression.conditions.map((c, i) => {
                      const op = i > 0 ? parsedExpression.operators[i - 1] : null;
                      return (
                        <React.Fragment key={c}>
                          {op && <span className={`mx-2 font-bold ${op === 'AND' ? 'text-blue-400' : 'text-purple-400'}`}>{op}</span>}
                          <span>{c}</span>
                        </React.Fragment>
                      );
                    }).join('')}
                  </code>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Position Layer */}
        <div className="flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-text-muted" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Position
          </h4>
          <div className={`px-4 py-3 rounded-lg border ${
            parsedExpression.conditions.length > 0
              ? 'bg-warning-500/10 border-warning-500/30'
              : 'bg-gray-500/10 border-gray-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {parsedExpression.conditions.length > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-warning-500" />
              ) : (
                <Circle className="w-5 h-5 fill-gray-500 text-gray-500" />
              )}
              <span className="text-sm font-medium text-text-primary">
                {strategyType === 'long_short' 
                  ? 'LONG (1) / SHORT (-1) / CASH (0)'
                  : 'LONG (1) / CASH (0)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-border-default">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-text-secondary mb-2">Operators</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded text-xs font-bold">AND</div>
                <span className="text-text-muted">Both conditions must be true</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded text-xs font-bold">OR</div>
                <span className="text-text-muted">Either condition can be true</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-text-secondary mb-2">How It Works</div>
            <div className="space-y-1 text-text-muted">
              <div>1. Indicators calculate values</div>
              <div>2. Conditions evaluate to TRUE/FALSE</div>
              <div>3. Combined signal uses AND/OR logic</div>
              <div>4. Position determined by signal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

