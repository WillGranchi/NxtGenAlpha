import React, { useState, useRef } from 'react';
import { IndicatorCard } from './IndicatorCard';
import { VisualConditionBuilder } from './VisualConditionBuilder';
import { ExpressionTemplates } from './ExpressionTemplates';
import { QuickSummary } from './QuickSummary';
import { StrategyDescription } from './StrategyDescription';
import SaveStrategyModal from './SaveStrategyModal';
import StrategySelector from './StrategySelector';
import { useAuth } from '../../hooks/useAuth';
import TradingAPI, { type IndicatorConfig, type IndicatorMetadata, type SavedStrategy, type StrategyResponse } from '../../services/api';

interface StrategyMakeupProps {
  selectedIndicators: IndicatorConfig[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  onUpdateIndicatorParams: (indicatorId: string, params: Record<string, any>) => void;
  onUpdateIndicatorShowOnChart: (indicatorId: string, showOnChart: boolean) => void;
  onRemoveIndicator: (indicatorId: string) => void;
  onUpdateExpression: (expression: string) => void;
  onUpdateLongExpression?: (expression: string) => void;
  onUpdateCashExpression?: (expression: string) => void;
  onUpdateShortExpression?: (expression: string) => void;
  onRunBacktest: () => void;
  isLoading: boolean;
  initialCapital: number;
  onUpdateInitialCapital: (capital: number) => void;
  expression: string;
  longExpression?: string;
  cashExpression?: string;
  shortExpression?: string;
  useSeparateExpressions?: boolean;
  onToggleSeparateExpressions?: (use: boolean) => void;
  strategyType?: 'long_cash' | 'long_short';
  onStrategyTypeChange?: (type: 'long_cash' | 'long_short') => void;
  availableConditions: Record<string, string>;
  onLoadStrategy?: (strategy: SavedStrategy) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const StrategyMakeup: React.FC<StrategyMakeupProps> = ({
  selectedIndicators,
  availableIndicators,
  onUpdateIndicatorParams,
  onUpdateIndicatorShowOnChart,
  onRemoveIndicator,
  onUpdateExpression,
  onUpdateLongExpression,
  onUpdateCashExpression,
  onUpdateShortExpression,
  onRunBacktest,
  isLoading,
  initialCapital,
  onUpdateInitialCapital,
  expression,
  longExpression = '',
  cashExpression = '',
  shortExpression = '',
  useSeparateExpressions = false,
  onToggleSeparateExpressions,
  strategyType = 'long_cash',
  onStrategyTypeChange,
  availableConditions,
  onLoadStrategy,
  onToast,
}) => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { isAuthenticated, login } = useAuth();

  const handleRunBacktest = () => {
    if (selectedIndicators.length === 0) {
      if (onToast) {
        onToast('Please add at least one indicator to your strategy.', 'error');
      } else {
        alert('Please add at least one indicator to your strategy.');
      }
      return;
    }
    
    if (isAdvancedMode) {
      if (useSeparateExpressions) {
        if (!longExpression.trim()) {
          if (onToast) {
            onToast('Please enter a LONG expression for your strategy.', 'error');
          } else {
            alert('Please enter a LONG expression for your strategy.');
          }
          return;
        }
      } else {
        if (!expression.trim()) {
          if (onToast) {
            onToast('Please enter an expression for your strategy.', 'error');
          } else {
            alert('Please enter an expression for your strategy.');
          }
          return;
        }
      }
    }
    
    onRunBacktest();
  };

  const handleSaveClick = () => {
    if (!isAuthenticated) {
      if (onToast) {
        onToast('Please log in to save strategies to your account.', 'warning');
      }
      // Optionally prompt login
      if (confirm('You need to log in to save strategies. Would you like to log in now?')) {
        login();
      }
      return;
    }

    if (selectedIndicators.length === 0) {
      if (onToast) {
        onToast('Please add at least one indicator to your strategy before saving.', 'error');
      }
      return;
    }

    setShowSaveModal(true);
  };

  const handleSaveStrategy = async (name: string, description?: string) => {
    try {
      const expressions: any = {};
      if (useSeparateExpressions) {
        if (longExpression) expressions.long_expression = longExpression;
        if (cashExpression && strategyType === 'long_cash') expressions.cash_expression = cashExpression;
        if (shortExpression && strategyType === 'long_short') expressions.short_expression = shortExpression;
        expressions.strategy_type = strategyType;
      } else {
        if (expression) expressions.expression = expression;
      }

      await TradingAPI.saveStrategy({
        name,
        description,
        indicators: selectedIndicators,
        expressions,
        parameters: { initial_capital: initialCapital },
      });

      if (onToast) {
        onToast(`Strategy "${name}" saved successfully!`, 'success');
      }
      setShowSaveModal(false);
    } catch (error: any) {
      throw error; // Let modal handle the error display
    }
  };

  const handleLoadStrategy = (strategy: StrategyResponse) => {
    // Convert StrategyResponse to SavedStrategy format for compatibility
    const savedStrategy: SavedStrategy = {
      version: '1.0.0',
      name: strategy.name,
      created_at: strategy.created_at,
      indicators: strategy.indicators,
      expression: strategy.expressions?.expression || strategy.expressions?.long_expression || '',
      initial_capital: strategy.parameters?.initial_capital || initialCapital,
      is_advanced_mode: !!(strategy.expressions?.long_expression || strategy.expressions?.expression),
    };

    if (onLoadStrategy) {
      onLoadStrategy(savedStrategy);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Strategy Configuration</h3>
        
        {/* Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${!isAdvancedMode ? 'text-primary-500 font-medium' : 'text-text-muted'}`}>
            Simple
          </span>
          <button
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAdvancedMode ? 'bg-primary-500' : 'bg-bg-elevated'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAdvancedMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${isAdvancedMode ? 'text-primary-500 font-medium' : 'text-text-muted'}`}>
            Advanced
          </span>
        </div>
      </div>

      {/* Initial Capital Input */}
      <div className="mb-6">
        <label htmlFor="initial-capital" className="block text-sm font-medium text-text-primary mb-2">
          Initial Capital ($)
        </label>
        <input
          id="initial-capital"
          type="number"
          min="1000"
          step="1000"
          value={initialCapital}
          onChange={(e) => onUpdateInitialCapital(Number(e.target.value))}
          className="input"
          placeholder="10000"
        />
      </div>

      {/* Quick Summary */}
      <div className="mb-6">
        <QuickSummary
          selectedIndicators={selectedIndicators}
          availableIndicators={availableIndicators}
          expression={expression}
          longExpression={longExpression}
          cashExpression={cashExpression}
          useSeparateExpressions={useSeparateExpressions}
        />
      </div>

      {/* Selected Indicators */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-text-primary mb-4">
          Selected Indicators ({selectedIndicators.length})
        </h4>
        
        {selectedIndicators.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border-default rounded-lg">
            <p className="text-text-secondary mb-2">No indicators selected</p>
            <p className="text-sm text-text-muted">
              {isAdvancedMode 
                ? 'Add indicators from the catalog above to build your strategy'
                : 'Add indicators to create a simple strategy'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedIndicators.map((indicator) => {
              const metadata = availableIndicators?.[indicator.id];
              if (!metadata) return null;
              
              return (
                <IndicatorCard
                  key={indicator.id}
                  indicator={metadata}
                  config={indicator}
                  onConfigChange={(config) => {
                    onUpdateIndicatorParams(indicator.id, config.params);
                    onUpdateIndicatorShowOnChart(indicator.id, config.show_on_chart);
                  }}
                  onRemove={() => onRemoveIndicator(indicator.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Overall Strategy Description (for separate expressions) */}
      {isAdvancedMode && useSeparateExpressions && (
        <div className="mb-6">
          <StrategyDescription
            longExpression={longExpression}
            cashExpression={cashExpression}
            shortExpression={shortExpression}
            useSeparateExpressions={true}
            strategyType={strategyType}
            selectedIndicators={selectedIndicators}
            availableIndicators={availableIndicators}
            availableConditions={availableConditions}
          />
        </div>
      )}

      {/* Expression Builder (Advanced Mode Only) */}
      {isAdvancedMode && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-text-primary">Strategy Expression</h4>
            {onToggleSeparateExpressions && (
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${!useSeparateExpressions ? 'text-primary-500 font-medium' : 'text-text-muted'}`}>
                  Single Expression
                </span>
                <button
                  onClick={() => onToggleSeparateExpressions(!useSeparateExpressions)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useSeparateExpressions ? 'bg-primary-500' : 'bg-bg-elevated'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useSeparateExpressions ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${useSeparateExpressions ? 'text-primary-500 font-medium' : 'text-text-muted'}`}>
                  Separate LONG/CASH
                </span>
              </div>
            )}
          </div>

          {useSeparateExpressions ? (
            /* Separate Expression Builders based on strategy type */
            <div className="space-y-6">
              {/* Expression Templates */}
              <ExpressionTemplates
                availableConditions={Object.keys(availableConditions)}
                selectedIndicators={selectedIndicators}
                onSelectTemplate={(expr: string) => {
                  if (onUpdateLongExpression) {
                    onUpdateLongExpression(expr);
                  }
                }}
                className="mb-4"
              />

              {/* LONG Expression Builder */}
              <div className="border border-primary-500/30 rounded-lg p-4 bg-primary-500/10">
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-primary-400 mb-1">
                    Go LONG when...
                  </label>
                  <p className="text-xs text-primary-300 mb-3">
                    Define the conditions that trigger a LONG position. When this expression is true, the strategy will go long.
                  </p>
                </div>
                <VisualConditionBuilder
                  expression={longExpression || ''}
                  onExpressionChange={onUpdateLongExpression || (() => {})}
                  availableConditions={availableConditions}
                  selectedIndicators={selectedIndicators}
                  availableIndicators={availableIndicators}
                />
              </div>

              {/* CASH or SHORT Expression Builder */}
              {strategyType === 'long_cash' ? (
                <div className="border border-warning-500/30 rounded-lg p-4 bg-warning-500/10">
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-warning-400 mb-1">
                      Go to CASH when... (Optional)
                    </label>
                    <p className="text-xs text-warning-300 mb-3">
                      Optionally define conditions that force exiting to cash. If empty, the strategy will exit to cash when the LONG expression is false.
                    </p>
                  </div>
                  <VisualConditionBuilder
                    expression={cashExpression || ''}
                    onExpressionChange={onUpdateCashExpression || (() => {})}
                    availableConditions={availableConditions}
                    selectedIndicators={selectedIndicators}
                    availableIndicators={availableIndicators}
                  />
                </div>
              ) : (
                <div className="border border-danger-500/30 rounded-lg p-4 bg-danger-500/10">
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-danger-400 mb-1">
                      Go SHORT when...
                    </label>
                    <p className="text-xs text-danger-300 mb-3">
                      Define the conditions that trigger a SHORT position. When this expression is true, the strategy will go short.
                    </p>
                  </div>
                  <VisualConditionBuilder
                    expression={shortExpression || ''}
                    onExpressionChange={onUpdateShortExpression || (() => {})}
                    availableConditions={availableConditions}
                    selectedIndicators={selectedIndicators}
                    availableIndicators={availableIndicators}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Single Expression Builder (Legacy) */
            <div className="space-y-4">
              {/* Expression Templates */}
              <ExpressionTemplates
                availableConditions={Object.keys(availableConditions)}
                selectedIndicators={selectedIndicators}
                onSelectTemplate={onUpdateExpression}
                className="mb-4"
              />

              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Build a single expression that defines when to go LONG (1 = LONG, 0 = {strategyType === 'long_short' ? 'SHORT' : 'CASH'}).
                </p>
                <VisualConditionBuilder
                  expression={expression}
                  onExpressionChange={onUpdateExpression}
                  availableConditions={availableConditions}
                  selectedIndicators={selectedIndicators}
                  availableIndicators={availableIndicators}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save/Load Section */}
      {isAuthenticated ? (
        <div className="mb-4 pt-4 border-t border-border-default">
          <div className="mb-4">
            <h4 className="text-md font-medium text-text-primary mb-3">Save & Load Strategy</h4>
            <StrategySelector
              onSelectStrategy={handleLoadStrategy}
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveClick}
              disabled={selectedIndicators.length === 0}
              className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                selectedIndicators.length === 0
                  ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                  : 'bg-success-500 text-white hover:bg-success-600 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 focus:ring-offset-bg-primary'
              }`}
            >
              Save Strategy
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 pt-4 border-t border-border-default bg-primary-500/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-md font-medium text-text-primary mb-1">
                Save Your Strategies
              </h4>
              <p className="text-sm text-text-secondary">
                Log in to save your strategies and access them from any device.
              </p>
            </div>
            <button
              onClick={login}
              className="btn-primary text-sm"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      )}

      {/* Save Strategy Modal */}
      <SaveStrategyModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveStrategy}
      />

      {/* Run Backtest Button */}
      <div className="flex items-center justify-between pt-4 border-t border-border-default">
        <div className="text-sm text-text-secondary">
          {isAdvancedMode ? (
            <span>
              {useSeparateExpressions 
                ? 'Advanced mode: Define separate conditions for LONG and CASH positions'
                : 'Advanced mode: Use the expression builder to combine indicator conditions'}
            </span>
          ) : (
            <span>
              Simple mode: All selected indicators will be combined with AND logic
            </span>
          )}
        </div>
        
        <button
          onClick={handleRunBacktest}
          disabled={
            isLoading || 
            selectedIndicators.length === 0 || 
            (isAdvancedMode && (
              useSeparateExpressions 
                ? (!longExpression || !longExpression.trim())
                : (!expression || !expression.trim())
            ))
          }
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            isLoading || 
            selectedIndicators.length === 0 || 
            (isAdvancedMode && (
              useSeparateExpressions 
                ? (!longExpression || !longExpression.trim())
                : (!expression || !expression.trim())
            ))
              ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Running Backtest...
            </div>
          ) : (
            'Run Backtest'
          )}
        </button>
      </div>
    </div>
  );
};

export default StrategyMakeup;
