/**
 * Side panel for indicator configuration
 */

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { EquityChart } from '../charts/EquityChart';
import { PriceChart } from '../charts/PriceChart';
import EnhancedMetrics from '../results/EnhancedMetrics';
import type { IndicatorConfig, IndicatorMetadata, BacktestResult, ModularBacktestResponse } from '../../services/api';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  indicatorConfig: IndicatorConfig | null;
  indicatorMetadata: IndicatorMetadata | null;
  onConfigUpdate: (config: IndicatorConfig) => void;
  onRemove: () => void;
  initialCapital?: number;
  onUpdateInitialCapital?: (capital: number) => void;
  onRunBacktest?: () => void;
  isBacktestLoading?: boolean;
  strategyType?: 'long_cash' | 'long_short';
  availableConditions?: Record<string, string>;
  expression?: string;
  onUpdateExpression?: (expression: string) => void;
  useSeparateExpressions?: boolean;
  backtestResults?: ModularBacktestResponse | null;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  nodeId,
  indicatorConfig,
  indicatorMetadata,
  onConfigUpdate,
  onRemove,
  initialCapital,
  onUpdateInitialCapital,
  onRunBacktest,
  isBacktestLoading = false,
  strategyType = 'long_cash',
  availableConditions = {},
  expression = '',
  onUpdateExpression,
  useSeparateExpressions = false,
  backtestResults,
}) => {
  const [activeTab, setActiveTab] = React.useState<'indicator' | 'strategy' | 'expression'>('indicator');

  // Get backtest result for this specific indicator
  const indicatorResult: BacktestResult | null = React.useMemo(() => {
    if (!backtestResults || !indicatorConfig || !backtestResults.individual_results) {
      return null;
    }
    return backtestResults.individual_results[indicatorConfig.id] || null;
  }, [backtestResults, indicatorConfig]);

  // Get combined result
  const combinedResult: BacktestResult | null = React.useMemo(() => {
    if (!backtestResults || !backtestResults.combined_result) {
      return null;
    }
    return backtestResults.combined_result;
  }, [backtestResults]);

  // Auto-switch to Strategy tab when backtest results are available
  React.useEffect(() => {
    if (combinedResult && activeTab !== 'strategy') {
      setActiveTab('strategy');
    }
  }, [combinedResult, activeTab]);

  if (!isOpen) {
    return <div className="w-0 flex-shrink-0" />; // Take up 0 width when closed but still in layout
  }

  // If no indicator selected, show strategy settings
  if (!indicatorConfig || !indicatorMetadata) {
    return (
      <div className="w-96 flex-shrink-0 bg-bg-secondary border-l border-border-default h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border-default flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Strategy Settings</h3>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {onUpdateInitialCapital && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Initial Capital ($)
                </label>
                <Input
                  type="number"
                  min="1000"
                  step="1000"
                  value={initialCapital || 10000}
                  onChange={(e) => onUpdateInitialCapital(Number(e.target.value))}
                />
              </div>
            )}
            {onRunBacktest && (
              <Button
                variant="primary"
                className="w-full"
                onClick={onRunBacktest}
                isLoading={isBacktestLoading}
              >
                Run Backtest
              </Button>
            )}
          </div>
      </div>
    );
  }

  const handleParameterChange = (paramName: string, value: number) => {
    const newParams = { ...indicatorConfig.params, [paramName]: value };
    onConfigUpdate({ ...indicatorConfig, params: newParams });
  };

  const handleShowOnChartChange = (show: boolean) => {
    onConfigUpdate({ ...indicatorConfig, show_on_chart: show });
  };

  return (
    <div className="w-96 flex-shrink-0 bg-bg-secondary border-l border-border-default h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {indicatorMetadata.name}
            </h3>
            <p className="text-sm text-text-muted mt-1">
              Configure indicator parameters
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-default">
          <button
            onClick={() => setActiveTab('indicator')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'indicator'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Indicator
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'strategy'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Strategy
          </button>
          <button
            onClick={() => setActiveTab('expression')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'expression'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Expression
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === 'indicator' && (
            <>
          {/* Description */}
          <div>
            <p className="text-sm text-text-secondary">
              {indicatorMetadata.description}
            </p>
          </div>

          {/* Show on Chart Toggle */}
          <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
            <label className="text-sm font-medium text-text-primary">
              Show on Chart
            </label>
            <input
              type="checkbox"
              checked={indicatorConfig.show_on_chart}
              onChange={(e) => handleShowOnChartChange(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </div>

          {/* Parameters */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              Parameters
            </h4>
            <div className="space-y-4">
              {Object.entries(indicatorMetadata.parameters).map(([paramName, param]) => (
                <div key={paramName}>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {paramName}
                    <span className="text-xs text-text-muted ml-1">
                      ({param.description})
                    </span>
                  </label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={param.min}
                      max={param.max}
                      step={param.type === 'float' ? 0.1 : 1}
                      value={indicatorConfig.params[paramName] ?? param.default}
                      onChange={(e) =>
                        handleParameterChange(
                          paramName,
                          param.type === 'float'
                            ? parseFloat(e.target.value) || param.default
                            : parseInt(e.target.value) || param.default
                        )
                      }
                    />
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.type === 'float' ? 0.1 : 1}
                      value={indicatorConfig.params[paramName] ?? param.default}
                      onChange={(e) =>
                        handleParameterChange(
                          paramName,
                          param.type === 'float'
                            ? parseFloat(e.target.value)
                            : parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{param.min}</span>
                      <span>{param.max}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Conditions */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              Available Conditions
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(indicatorMetadata.conditions).map(([conditionName, description]) => (
                <div
                  key={conditionName}
                  className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary border border-border-default"
                  title={description}
                >
                  <code className="text-primary-400">{conditionName}</code>
                </div>
              ))}
            </div>
          </div>
            </>
          )}

          {activeTab === 'strategy' && (
            <>
              {onUpdateInitialCapital && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Initial Capital ($)
                  </label>
                  <Input
                    type="number"
                    min="1000"
                    step="1000"
                    value={initialCapital || 10000}
                    onChange={(e) => onUpdateInitialCapital(Number(e.target.value))}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Strategy Type
                </label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      strategyType === 'long_cash'
                        ? 'bg-primary-500 text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'
                    }`}
                    disabled
                  >
                    {strategyType === 'long_cash' ? 'Long/Cash' : 'Long/Short'}
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Change strategy type in the main dashboard
                </p>
              </div>
              {onRunBacktest && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={onRunBacktest}
                  isLoading={isBacktestLoading}
                >
                  Run Backtest
                </Button>
              )}

              {/* Backtest Results */}
              {combinedResult && (
                <div className="mt-6 space-y-4 border-t border-border-default pt-4">
                  <h4 className="text-sm font-semibold text-text-primary">Backtest Results</h4>
                  
                  {/* Metrics - Compact View */}
                  {combinedResult.metrics && (
                    <EnhancedMetrics
                      metrics={combinedResult.metrics}
                      compact={true}
                    />
                  )}

                  {/* Mini Equity Chart */}
                  {combinedResult.equity_curve && combinedResult.equity_curve.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-text-secondary mb-2">Equity Curve</div>
                      <div className="bg-bg-tertiary rounded-lg p-2" style={{ height: '200px' }}>
                        <EquityChart
                          data={combinedResult.equity_curve}
                          height={180}
                          strategyType={strategyType}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mini Price Chart with Strategy */}
                  {combinedResult.equity_curve && combinedResult.equity_curve.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-text-secondary mb-2">Price & Strategy</div>
                      <div className="bg-bg-tertiary rounded-lg p-2" style={{ height: '200px' }}>
                        <PriceChart
                          data={combinedResult.equity_curve}
                          height={180}
                        />
                      </div>
                    </div>
                  )}

                  {/* Individual Indicator Result (if available) */}
                  {indicatorResult && indicatorConfig && (
                    <div className="mt-4 pt-4 border-t border-border-default">
                      <div className="text-xs font-medium text-text-secondary mb-2">
                        {indicatorMetadata?.name || indicatorConfig.id} Performance
                      </div>
                      {indicatorResult.metrics && (
                        <EnhancedMetrics
                          metrics={indicatorResult.metrics}
                          compact={true}
                          title=""
                        />
                      )}
                      {indicatorResult.equity_curve && indicatorResult.equity_curve.length > 0 && (
                        <div className="bg-bg-tertiary rounded-lg p-2" style={{ height: '150px' }}>
                          <EquityChart
                            data={indicatorResult.equity_curve}
                            height={130}
                            strategyType={strategyType}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'expression' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Generated Expression
                </label>
                <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default">
                  <code className="text-sm text-text-primary font-code break-all">
                    {expression || 'No expression generated yet. Connect indicators to generate an expression.'}
                  </code>
                </div>
              </div>
              {onUpdateExpression && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Manual Override (Optional)
                  </label>
                  <textarea
                    value={expression}
                    onChange={(e) => onUpdateExpression(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary font-code text-sm"
                    rows={6}
                    placeholder="Enter expression manually (e.g., RSI_OVERSOLD AND MACD_CROSS_UP)"
                  />
                  <p className="text-xs text-text-muted mt-2">
                    Manually edit the expression. Changes will override the visual connections.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-default">
          <Button
            variant="danger"
            className="w-full"
            onClick={onRemove}
          >
            Remove Indicator
          </Button>
        </div>
    </div>
  );
};

