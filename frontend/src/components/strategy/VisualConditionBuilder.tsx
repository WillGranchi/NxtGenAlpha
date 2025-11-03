import React, { useState, useEffect, useMemo } from 'react';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface ConditionRow {
  id: string;
  indicatorId: string | '';
  conditionName: string | '';
  operator: 'AND' | 'OR' | null; // Operator before this row (null for first row)
}

interface VisualConditionBuilderProps {
  expression: string;
  availableConditions: Record<string, string>; // condition_name -> description
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  onExpressionChange: (expression: string) => void;
  className?: string;
}

export const VisualConditionBuilder: React.FC<VisualConditionBuilderProps> = ({
  expression,
  availableConditions,
  selectedIndicators,
  availableIndicators,
  onExpressionChange,
  className = ''
}) => {
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>([]);

  // Parse expression into condition rows on mount or when expression prop changes
  useEffect(() => {
    if (!expression.trim()) {
      setConditionRows([]);
      return;
    }

    // Try to parse the expression into rows
    // Simple parser: split by AND/OR, extract condition names
    const parts = expression.split(/\s+(AND|OR)\s+/i);
    const rows: ConditionRow[] = [];
    let operator: 'AND' | 'OR' | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      
      // Check if it's an operator
      if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
        operator = part.toUpperCase() as 'AND' | 'OR';
        continue;
      }

      // Remove parentheses
      const cleanPart = part.replace(/[()]/g, '').trim();
      
      // Try to find matching condition
      const conditionName = Object.keys(availableConditions).find(
        cond => cond === cleanPart || cond.toLowerCase() === cleanPart.toLowerCase()
      );

      if (conditionName) {
        // Find which indicator this condition belongs to
        const indicatorId = findIndicatorForCondition(conditionName, availableIndicators, selectedIndicators);
        
        rows.push({
          id: `row-${Date.now()}-${i}`,
          indicatorId: indicatorId || '',
          conditionName,
          operator: rows.length > 0 ? operator : null
        });
        operator = null;
      }
    }

    // If we successfully parsed, use those rows
    if (rows.length > 0) {
      setConditionRows(rows);
    } else if (expression.trim()) {
      // Expression exists but couldn't parse - add a single empty row
      setConditionRows([{
        id: `row-${Date.now()}`,
        indicatorId: '',
        conditionName: '',
        operator: null
      }]);
    }
  }, []); // Only on mount

  // Generate expression string from rows whenever they change
  useEffect(() => {
    const generatedExpression = generateExpressionFromRows(conditionRows);
    if (generatedExpression !== expression) {
      onExpressionChange(generatedExpression);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionRows]);

  // Get conditions for a specific indicator
  const getConditionsForIndicator = (indicatorId: string): Record<string, string> => {
    if (!indicatorId || !availableIndicators || !availableIndicators[indicatorId]) {
      return {};
    }
    
    const indicator = availableIndicators[indicatorId];
    const conditions: Record<string, string> = {};
    
    if (indicator.conditions) {
      Object.entries(indicator.conditions).forEach(([name, desc]) => {
        conditions[name] = desc;
      });
    }
    
    return conditions;
  };

  // Find which indicator a condition belongs to
  const findIndicatorForCondition = (
    conditionName: string,
    availableIndicators: Record<string, IndicatorMetadata> | null,
    selectedIndicators: IndicatorConfig[]
  ): string | null => {
    if (!availableIndicators) return null;
    
    for (const selected of selectedIndicators) {
      const indicator = availableIndicators[selected.id];
      if (indicator?.conditions && conditionName in indicator.conditions) {
        return selected.id;
      }
    }
    
    return null;
  };

  // Generate expression string from condition rows
  const generateExpressionFromRows = (rows: ConditionRow[]): string => {
    if (rows.length === 0) return '';
    
    const parts: string[] = [];
    
    rows.forEach((row, index) => {
      if (!row.conditionName) return;
      
      // Add operator before this condition (except first)
      if (row.operator && index > 0) {
        parts.push(row.operator);
      }
      
      parts.push(row.conditionName);
    });
    
    return parts.join(' ');
  };

  // Generate readable preview
  const readablePreview = useMemo(() => {
    if (conditionRows.length === 0) {
      return 'No conditions set';
    }
    
    const parts: string[] = [];
    
    conditionRows.forEach((row, index) => {
      if (!row.conditionName) return;
      
      const description = availableConditions[row.conditionName] || row.conditionName;
      
      if (row.operator && index > 0) {
        parts.push(row.operator.toLowerCase());
      }
      
      parts.push(description);
    });
    
    if (parts.length === 0) return 'No conditions set';
    
    // Capitalize first letter
    parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    
    return parts.join(' ');
  }, [conditionRows, availableConditions]);

  // Add new condition row
  const addConditionRow = () => {
    const newRow: ConditionRow = {
      id: `row-${Date.now()}`,
      indicatorId: selectedIndicators.length > 0 ? selectedIndicators[0].id : '',
      conditionName: '',
      operator: conditionRows.length > 0 ? 'AND' : null
    };
    
    setConditionRows(prev => [...prev, newRow]);
  };

  // Remove condition row
  const removeConditionRow = (rowId: string) => {
    setConditionRows(prev => {
      const filtered = prev.filter(row => row.id !== rowId);
      // If removing first row, make sure second row (now first) has no operator
      if (filtered.length > 0) {
        filtered[0].operator = null;
      }
      return filtered;
    });
  };

  // Update condition row
  const updateConditionRow = (rowId: string, updates: Partial<ConditionRow>) => {
    setConditionRows(prev => 
      prev.map(row => {
        if (row.id === rowId) {
          const updated = { ...row, ...updates };
          // If indicator changed, clear condition name
          if (updates.indicatorId !== undefined && updates.indicatorId !== row.indicatorId) {
            updated.conditionName = '';
          }
          return updated;
        }
        return row;
      })
    );
  };

  // Update operator for a row
  const updateOperator = (rowId: string, operator: 'AND' | 'OR') => {
    setConditionRows(prev =>
      prev.map(row => {
        if (row.id === rowId) {
          return { ...row, operator };
        }
        return row;
      })
    );
  };

  // If no indicators selected, show message
  if (selectedIndicators.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-gray-500 text-center">
          Add indicators to build conditions
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-300 rounded-lg p-4 ${className}`}>
      {/* Preview Section */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs font-medium text-blue-900 mb-1">Preview:</div>
        <div className="text-sm text-blue-800 font-medium">{readablePreview}</div>
        <div className="text-xs text-blue-600 font-mono mt-1 break-all">
          {generateExpressionFromRows(conditionRows) || '(empty)'}
        </div>
      </div>

      {/* Condition Rows */}
      <div className="space-y-3">
        {conditionRows.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No conditions added. Click "Add Condition" to start building your logic.
          </div>
        ) : (
          conditionRows.map((row, index) => {
            const indicatorConditions = row.indicatorId 
              ? getConditionsForIndicator(row.indicatorId)
              : {};
            
            return (
              <div key={row.id} className="flex items-start gap-2">
                {/* Operator Selector (before condition, except first) */}
                {index > 0 && (
                  <div className="flex flex-col items-center pt-2">
                    <button
                      onClick={() => updateOperator(row.id, 'AND')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        row.operator === 'AND'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      AND
                    </button>
                    <span className="text-xs text-gray-400 my-1">or</span>
                    <button
                      onClick={() => updateOperator(row.id, 'OR')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        row.operator === 'OR'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      OR
                    </button>
                  </div>
                )}

                {/* Condition Row */}
                <div className="flex-1 flex items-start gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                  {/* Indicator Dropdown */}
                  <select
                    value={row.indicatorId}
                    onChange={(e) => updateConditionRow(row.id, { 
                      indicatorId: e.target.value,
                      conditionName: '' // Clear condition when indicator changes
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Indicator</option>
                    {selectedIndicators.map(ind => {
                      const metadata = availableIndicators?.[ind.id];
                      return (
                        <option key={ind.id} value={ind.id}>
                          {metadata?.name || ind.id}
                        </option>
                      );
                    })}
                  </select>

                  {/* Condition Dropdown */}
                  <select
                    value={row.conditionName}
                    onChange={(e) => updateConditionRow(row.id, { conditionName: e.target.value })}
                    disabled={!row.indicatorId || Object.keys(indicatorConditions).length === 0}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Select Condition</option>
                    {Object.entries(indicatorConditions).map(([name, description]) => (
                      <option key={name} value={name}>
                        {description}
                      </option>
                    ))}
                  </select>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeConditionRow(row.id)}
                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove condition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Condition Button */}
      <button
        onClick={addConditionRow}
        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        + Add Condition
      </button>

      {/* Helper Text */}
      <p className="mt-3 text-xs text-gray-500">
        Select an indicator and condition for each row. Use AND/OR buttons to combine multiple conditions.
      </p>
    </div>
  );
};

