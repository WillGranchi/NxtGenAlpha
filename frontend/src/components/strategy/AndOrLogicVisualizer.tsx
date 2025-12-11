/**
 * AND/OR Logic Visualizer Component
 * Shows visual grouping, truth tables, and step-by-step evaluation
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface AndOrLogicVisualizerProps {
  expression: string;
  availableConditions: Record<string, string>;
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  className?: string;
}

interface ParsedCondition {
  name: string;
  description: string;
  indicatorName?: string;
}

interface ExpressionGroup {
  type: 'condition' | 'group';
  content: ParsedCondition | ExpressionGroup[];
  operator?: 'AND' | 'OR';
}

export const AndOrLogicVisualizer: React.FC<AndOrLogicVisualizerProps> = ({
  expression,
  availableConditions,
  selectedIndicators,
  availableIndicators,
  className = '',
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showTruthTable, setShowTruthTable] = useState(true);

  // Parse expression into hierarchical groups
  const parsedGroups = useMemo(() => {
    if (!expression.trim()) return null;

    const parseExpression = (expr: string, depth: number = 0): ExpressionGroup[] => {
      if (depth > 10) return []; // Prevent infinite recursion

      const groups: ExpressionGroup[] = [];
      let currentGroup: ExpressionGroup[] = [];
      let currentOperator: 'AND' | 'OR' | null = null;
      let parenDepth = 0;
      let startIdx = 0;

      for (let i = 0; i < expr.length; i++) {
        const char = expr[i];
        
        if (char === '(') {
          if (parenDepth === 0) {
            // Save current group before nested group
            if (currentGroup.length > 0) {
              groups.push({
                type: 'group',
                content: currentGroup,
                operator: currentOperator || undefined,
              });
              currentGroup = [];
            }
            startIdx = i + 1;
          }
          parenDepth++;
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            // Parse nested expression
            const nestedExpr = expr.substring(startIdx, i);
            const nestedGroups = parseExpression(nestedExpr, depth + 1);
            if (nestedGroups.length > 0) {
              currentGroup.push({
                type: 'group',
                content: nestedGroups,
              });
            }
          }
        } else if (parenDepth === 0) {
          // Check for operators
          const remaining = expr.substring(i);
          if (remaining.match(/^\s+AND\s+/i)) {
            if (currentGroup.length > 0) {
              currentOperator = 'AND';
            }
            i += 4; // Skip "AND"
            continue;
          } else if (remaining.match(/^\s+OR\s+/i)) {
            if (currentGroup.length > 0) {
              currentOperator = 'OR';
            }
            i += 3; // Skip "OR"
            continue;
          } else {
            // Extract condition name
            const match = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (match) {
              const conditionName = match[1];
              if (conditionName in availableConditions) {
                // Find indicator for this condition
                let indicatorName: string | undefined;
                for (const indicator of selectedIndicators) {
                  const metadata = availableIndicators?.[indicator.id];
                  if (metadata?.conditions && conditionName in metadata.conditions) {
                    indicatorName = metadata.name;
                    break;
                  }
                }

                currentGroup.push({
                  type: 'condition',
                  content: {
                    name: conditionName,
                    description: availableConditions[conditionName],
                    indicatorName,
                  },
                });
                i += conditionName.length - 1;
              }
            }
          }
        }
      }

      // Add remaining group
      if (currentGroup.length > 0) {
        groups.push({
          type: 'group',
          content: currentGroup,
          operator: currentOperator || undefined,
        });
      }

      return groups.length > 0 ? groups : [];
    };

    return parseExpression(expression);
  }, [expression, availableConditions, selectedIndicators, availableIndicators]);

  // Extract all conditions from expression
  const allConditions = useMemo(() => {
    if (!expression.trim()) return [];

    const conditions: ParsedCondition[] = [];
    const parts = expression.split(/\s+(AND|OR)\s+/i);

    for (const part of parts) {
      const cleanPart = part.trim().replace(/[()]/g, '');
      if (cleanPart && cleanPart.toUpperCase() !== 'AND' && cleanPart.toUpperCase() !== 'OR') {
        if (cleanPart in availableConditions) {
          // Find indicator for this condition
          let indicatorName: string | undefined;
          for (const indicator of selectedIndicators) {
            const metadata = availableIndicators?.[indicator.id];
            if (metadata?.conditions && cleanPart in metadata.conditions) {
              indicatorName = metadata.name;
              break;
            }
          }

          conditions.push({
            name: cleanPart,
            description: availableConditions[cleanPart],
            indicatorName,
          });
        }
      }
    }

    return conditions;
  }, [expression, availableConditions, selectedIndicators, availableIndicators]);

  // Generate truth table
  const truthTable = useMemo(() => {
    if (allConditions.length === 0) return null;
    if (allConditions.length > 4) return null; // Limit to 4 conditions for readability

    const numRows = Math.pow(2, allConditions.length);
    const rows: Array<{ values: boolean[]; result: boolean }> = [];

    for (let i = 0; i < numRows; i++) {
      const values: boolean[] = [];
      for (let j = 0; j < allConditions.length; j++) {
        values.push((i & (1 << (allConditions.length - 1 - j))) !== 0);
      }

      // Evaluate expression with these values
      let expr = expression;
      allConditions.forEach((cond, idx) => {
        const regex = new RegExp(`\\b${cond.name}\\b`, 'g');
        expr = expr.replace(regex, values[idx] ? 'TRUE' : 'FALSE');
      });

      // Replace AND/OR with JavaScript operators
      expr = expr.replace(/\bAND\b/gi, '&&');
      expr = expr.replace(/\bOR\b/gi, '||');
      
      // Evaluate (simple evaluation - be careful with this)
      let result = false;
      try {
        // Remove parentheses and evaluate
        const cleanExpr = expr.replace(/[()]/g, '');
        result = eval(cleanExpr) === true;
      } catch {
        // If evaluation fails, try to parse manually
        result = expr.includes('TRUE');
      }

      rows.push({ values, result });
    }

    return rows;
  }, [expression, allConditions]);

  // Render visual grouping
  const renderGroup = (group: ExpressionGroup, depth: number = 0, groupId: string = '0'): React.ReactNode => {
    if (group.type === 'condition') {
      const cond = group.content as ParsedCondition;
      return (
        <div
          key={cond.name}
          className="px-3 py-2 bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg"
        >
          <div className="text-sm font-medium text-text-primary">{cond.description}</div>
          {cond.indicatorName && (
            <div className="text-xs text-text-muted mt-1">from {cond.indicatorName}</div>
          )}
        </div>
      );
    }

    const subGroups = group.content as ExpressionGroup[];
    const isExpanded = expandedGroups.has(groupId);

    return (
      <div key={groupId} className={`border-2 rounded-lg p-3 ${
        group.operator === 'AND' 
          ? 'border-blue-500/40 bg-blue-500/5' 
          : group.operator === 'OR'
          ? 'border-purple-500/40 bg-purple-500/5'
          : 'border-border-default bg-bg-tertiary'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {group.operator && (
              <div className={`px-2 py-1 rounded text-xs font-bold ${
                group.operator === 'AND'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
              }`}>
                {group.operator}
              </div>
            )}
            <span className="text-xs font-semibold text-text-secondary">
              {group.operator ? `${group.operator} Group` : 'Group'}
            </span>
          </div>
          <button
            onClick={() => {
              const newExpanded = new Set(expandedGroups);
              if (isExpanded) {
                newExpanded.delete(groupId);
              } else {
                newExpanded.add(groupId);
              }
              setExpandedGroups(newExpanded);
            }}
            className="text-text-muted hover:text-text-primary"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {isExpanded && (
          <div className="space-y-2 mt-2">
            {subGroups.map((subGroup, idx) => (
              <div key={idx}>
                {renderGroup(subGroup, depth + 1, `${groupId}-${idx}`)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!expression.trim() || allConditions.length === 0) {
    return (
      <div className={`p-4 bg-bg-secondary border border-border-default rounded-lg ${className}`}>
        <div className="text-center text-text-muted text-sm">
          Build an expression to see AND/OR logic visualization
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-bg-secondary border border-border-default rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">AND/OR Logic</h3>
        <button
          onClick={() => setShowTruthTable(!showTruthTable)}
          className="text-sm text-text-muted hover:text-text-primary"
        >
          {showTruthTable ? 'Hide' : 'Show'} Truth Table
        </button>
      </div>

      {/* Visual Grouping */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-text-secondary mb-3">Visual Grouping</h4>
        {parsedGroups && parsedGroups.length > 0 ? (
          <div className="space-y-3">
            {parsedGroups.map((group, idx) => renderGroup(group, 0, `root-${idx}`))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allConditions.map((cond) => (
              <div
                key={cond.name}
                className="px-3 py-2 bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg"
              >
                <div className="text-sm font-medium text-text-primary">{cond.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Truth Table */}
      {showTruthTable && truthTable && (
        <div className="mt-6 pt-6 border-t border-border-default">
          <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Truth Table
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  {allConditions.map((cond) => (
                    <th key={cond.name} className="px-3 py-2 text-left text-text-secondary font-medium">
                      {cond.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-text-secondary font-medium border-l border-border-default">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {truthTable.map((row, idx) => (
                  <tr key={idx} className="border-b border-border-default/50">
                    {row.values.map((value, condIdx) => (
                      <td
                        key={condIdx}
                        className={`px-3 py-2 ${
                          value ? 'text-success-500 font-medium' : 'text-text-muted'
                        }`}
                      >
                        {value ? 'TRUE' : 'FALSE'}
                      </td>
                    ))}
                    <td
                      className={`px-3 py-2 border-l border-border-default font-bold ${
                        row.result ? 'text-success-500' : 'text-text-muted'
                      }`}
                    >
                      {row.result ? 'TRUE' : 'FALSE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Shows all possible combinations of condition values and the resulting signal
          </p>
        </div>
      )}

      {/* Step-by-step Explanation */}
      <div className="mt-6 pt-6 border-t border-border-default">
        <h4 className="text-sm font-semibold text-text-secondary mb-3">How It Works</h4>
        <div className="space-y-2 text-sm text-text-muted">
          <div className="flex items-start gap-2">
            <span className="font-bold text-text-primary">1.</span>
            <span>Each condition evaluates to TRUE or FALSE based on indicator values</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-text-primary">2.</span>
            <span>
              <span className="font-semibold text-blue-400">AND</span> requires{' '}
              <span className="font-semibold">both</span> conditions to be TRUE
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-text-primary">3.</span>
            <span>
              <span className="font-semibold text-purple-400">OR</span> requires{' '}
              <span className="font-semibold">either</span> condition to be TRUE
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-text-primary">4.</span>
            <span>Parentheses group conditions together (evaluated first)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-text-primary">5.</span>
            <span>Final result determines trading position (TRUE = LONG, FALSE = CASH/SHORT)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

