/**
 * Combined backtest component with results display.
 */

import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { TradingAPI } from '../../services/api';
import { EquityChart } from '../charts/EquityChart';
import { PerformanceMetrics } from './PerformanceMetrics';
import { DateRangePicker } from '../DateRangePicker';

interface CombinedBacktestProps {
  strategySelection: {
    indicator_strategy_ids: number[];
    valuation_strategy_ids: number[];
    fullcycle_preset_ids: number[];
  };
  combinationRule: {
    method: 'weighted' | 'majority' | 'custom';
    weights?: Record<string, number>;
    threshold?: number;
    expression?: string;
  };
  symbol?: string;
}

export const CombinedBacktest: React.FC<CombinedBacktestProps> = ({
  strategySelection,
  combinationRule,
  symbol = 'BTCUSDT'
}) => {
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await TradingAPI.runCombinedBacktest({
        strategy_selection: strategySelection,
        combination_rule: combinationRule,
        start_date: startDate,
        end_date: endDate || undefined,
        symbol,
        initial_capital: initialCapital
      });
      
      setResults(response);
    } catch (err: any) {
      setError(err.message || 'Failed to run backtest');
      console.error('Error running combined backtest:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasSelectedStrategies = 
    strategySelection.indicator_strategy_ids.length > 0 ||
    strategySelection.valuation_strategy_ids.length > 0 ||
    strategySelection.fullcycle_preset_ids.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Combined Backtest</h3>
        
        <div className="space-y-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Initial Capital
            </label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 10000)}
              className="w-full p-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-primary-500"
              min="1000"
              step="1000"
            />
          </div>
          
          <button
            onClick={handleRunBacktest}
            disabled={loading || !hasSelectedStrategies}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
              loading || !hasSelectedStrategies
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Run Combined Backtest
              </>
            )}
          </button>
          
          {!hasSelectedStrategies && (
            <p className="text-sm text-yellow-400">
              Please select at least one strategy to run a backtest.
            </p>
          )}
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
      
      {results && (
        <div className="space-y-6">
          <PerformanceMetrics
            metrics={results.metrics}
            strategyName="Combined Strategy"
          />
          
          {results.backtest_results?.equity_curve && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Equity Curve</h3>
              <EquityChart
                data={results.backtest_results.equity_curve}
                height={400}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

