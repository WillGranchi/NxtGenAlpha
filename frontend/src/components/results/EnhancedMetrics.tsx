/**
 * Enhanced Metrics Component
 * Unified, optimized metrics display with dark theme and proper formatting
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import type { BacktestMetrics } from '../../services/api';

interface EnhancedMetricsProps {
  metrics: BacktestMetrics;
  title?: string;
  className?: string;
  compact?: boolean;
}

interface MetricItem {
  key: string;
  label: string;
  value: number | undefined;
  format: 'percentage' | 'currency' | 'number' | 'integer';
  icon: React.ReactNode;
  color: 'positive' | 'negative' | 'neutral';
  category: 'returns' | 'risk' | 'trading' | 'advanced';
  priority: number; // Higher = more important
}

export const EnhancedMetrics: React.FC<EnhancedMetricsProps> = ({
  metrics,
  title = "Performance Metrics",
  className = "",
  compact = false,
}) => {
  // Format value based on type
  const formatValue = useMemo(() => {
    return (value: number | undefined, format: string): string => {
      if (value === undefined || value === null || isNaN(value)) {
        return 'N/A';
      }

      switch (format) {
        case 'percentage':
          // Handle both decimal (0-1) and percentage formats
          // If value is already > 1 or < -1, it's likely already a percentage
          if (Math.abs(value) > 1) {
            return `${value.toFixed(2)}%`;
          }
          return `${(value * 100).toFixed(2)}%`;
        case 'currency':
          return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'integer':
          return Math.round(value).toLocaleString();
        case 'number':
          return value.toFixed(2);
        default:
          return value.toString();
      }
    };
  }, []);

  // Get color class based on metric type and value
  const getColorClass = (item: MetricItem): string => {
    if (item.value === undefined || item.value === null || isNaN(item.value)) {
      return 'text-text-muted';
    }

    switch (item.color) {
      case 'positive':
        return item.value >= 0 ? 'text-success-500' : 'text-danger-500';
      case 'negative':
        return item.value <= 0 ? 'text-success-500' : 'text-danger-500';
      default:
        return 'text-text-primary';
    }
  };

  // Define all metrics with proper mapping
  const allMetrics: MetricItem[] = useMemo(() => [
    // Returns - High Priority
    {
      key: 'total_return',
      label: 'Total Return',
      // Prefer net_profit_pct if available (already percentage), otherwise use total_return (decimal)
      value: metrics.net_profit_pct !== undefined
        ? metrics.net_profit_pct / 100  // Convert percentage to decimal
        : metrics.total_return,  // Already decimal
      format: 'percentage',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'positive',
      category: 'returns',
      priority: 10,
    },
    {
      key: 'cagr',
      label: 'CAGR',
      value: metrics.cagr,
      format: 'percentage',
      icon: <Activity className="w-5 h-5" />,
      color: 'positive',
      category: 'returns',
      priority: 9,
    },
    {
      key: 'final_portfolio_value',
      label: 'Final Value',
      value: metrics.final_portfolio_value,
      format: 'currency',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'positive',
      category: 'returns',
      priority: 8,
    },
    // Risk Metrics - High Priority
    {
      key: 'sharpe_ratio',
      label: 'Sharpe Ratio',
      value: metrics.sharpe_ratio,
      format: 'number',
      icon: <Zap className="w-5 h-5" />,
      color: 'positive',
      category: 'risk',
      priority: 9,
    },
    {
      key: 'max_drawdown',
      label: 'Max Drawdown',
      // Prefer max_drawdown_pct if available (already as positive percentage)
      // Otherwise use max_drawdown (negative decimal)
      value: metrics.max_drawdown_pct !== undefined 
        ? -metrics.max_drawdown_pct / 100  // Convert positive percentage to negative decimal
        : metrics.max_drawdown,  // Already a negative decimal
      format: 'percentage',
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'negative',
      category: 'risk',
      priority: 8,
    },
    {
      key: 'sortino_ratio',
      label: 'Sortino Ratio',
      value: metrics.sortino_ratio,
      format: 'number',
      icon: <Target className="w-5 h-5" />,
      color: 'positive',
      category: 'risk',
      priority: 7,
    },
    // Trading Stats - Medium Priority
    {
      key: 'win_rate',
      label: 'Win Rate',
      // win_rate might be percentage (0-100) or decimal (0-1)
      value: metrics.win_rate !== undefined && metrics.win_rate > 1
        ? metrics.win_rate / 100  // Convert percentage to decimal
        : metrics.win_rate,  // Already decimal
      format: 'percentage',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'positive',
      category: 'trading',
      priority: 7,
    },
    {
      key: 'total_trades',
      label: 'Total Trades',
      value: metrics.total_trades,
      format: 'integer',
      icon: <Activity className="w-5 h-5" />,
      color: 'neutral',
      category: 'trading',
      priority: 6,
    },
    {
      key: 'profitable_trades',
      label: 'Winning Trades',
      value: metrics.profitable_trades,
      format: 'integer',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'positive',
      category: 'trading',
      priority: 5,
    },
    {
      key: 'losing_trades',
      label: 'Losing Trades',
      value: metrics.losing_trades,
      format: 'integer',
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'negative',
      category: 'trading',
      priority: 5,
    },
    // Advanced Metrics - Lower Priority
    {
      key: 'calmar_ratio',
      label: 'Calmar Ratio',
      value: metrics.calmar_ratio,
      format: 'number',
      icon: <Target className="w-5 h-5" />,
      color: 'positive',
      category: 'advanced',
      priority: 4,
    },
    {
      key: 'omega_ratio',
      label: 'Omega Ratio',
      value: metrics.omega_ratio,
      format: 'number',
      icon: <Activity className="w-5 h-5" />,
      color: 'positive',
      category: 'advanced',
      priority: 3,
    },
    {
      key: 'var_95',
      label: 'VaR (95%)',
      value: metrics.var_95,
      format: 'percentage',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'negative',
      category: 'advanced',
      priority: 3,
    },
    {
      key: 'cvar_95',
      label: 'CVaR (95%)',
      value: metrics.cvar_95,
      format: 'percentage',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'negative',
      category: 'advanced',
      priority: 2,
    },
    {
      key: 'avg_trade_return',
      label: 'Avg Trade Return',
      value: metrics.avg_trade_return,
      format: 'percentage',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'positive',
      category: 'advanced',
      priority: 4,
    },
  ], [metrics]);

  // Filter and sort metrics by priority, only show those with values
  const displayMetrics = useMemo(() => {
    return allMetrics
      .filter(m => m.value !== undefined && m.value !== null && !isNaN(m.value))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, compact ? 8 : allMetrics.length);
  }, [allMetrics, compact]);

  // Group metrics by category
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, MetricItem[]> = {
      returns: [],
      risk: [],
      trading: [],
      advanced: [],
    };

    displayMetrics.forEach(metric => {
      groups[metric.category].push(metric);
    });

    return groups;
  }, [displayMetrics]);

  if (displayMetrics.length === 0) {
    return (
      <div className={`bg-bg-tertiary rounded-xl border border-border-default p-6 ${className}`}>
        <p className="text-text-muted text-center">No metrics available</p>
      </div>
    );
  }

  return (
    <div className={`bg-bg-tertiary rounded-xl border border-border-default ${compact ? 'p-4' : 'p-6'} ${className}`}>
      {title && <h3 className={`${compact ? 'text-base mb-4' : 'text-lg mb-6'} font-semibold text-text-primary`}>{title}</h3>}
      
      {compact ? (
        // Compact grid view - optimized for side panel (2 columns)
        <div className="grid grid-cols-2 gap-3">
          {displayMetrics.map((metric) => (
            <div
              key={metric.key}
              className="bg-bg-secondary rounded-lg p-3 border border-border-default hover:border-primary-500/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`${getColorClass(metric)}`}>
                  {metric.icon}
                </div>
              </div>
              <div className={`text-xl font-bold ${getColorClass(metric)} mb-1`}>
                {formatValue(metric.value, metric.format)}
              </div>
              <div className="text-xs text-text-secondary font-medium leading-tight">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Full grouped view
        <div className="space-y-6">
          {/* Returns Section */}
          {groupedMetrics.returns.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                Returns
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedMetrics.returns.map((metric) => (
                  <div
                    key={metric.key}
                    className="bg-bg-secondary rounded-lg p-4 border border-border-default hover:border-primary-500/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${getColorClass(metric)}`}>
                        {metric.icon}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getColorClass(metric)} mb-1`}>
                      {formatValue(metric.value, metric.format)}
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Metrics Section */}
          {groupedMetrics.risk.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                Risk Metrics
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedMetrics.risk.map((metric) => (
                  <div
                    key={metric.key}
                    className="bg-bg-secondary rounded-lg p-4 border border-border-default hover:border-primary-500/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${getColorClass(metric)}`}>
                        {metric.icon}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getColorClass(metric)} mb-1`}>
                      {formatValue(metric.value, metric.format)}
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trading Stats Section */}
          {groupedMetrics.trading.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                Trading Statistics
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {groupedMetrics.trading.map((metric) => (
                  <div
                    key={metric.key}
                    className="bg-bg-secondary rounded-lg p-4 border border-border-default hover:border-primary-500/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${getColorClass(metric)}`}>
                        {metric.icon}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getColorClass(metric)} mb-1`}>
                      {formatValue(metric.value, metric.format)}
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Metrics Section */}
          {groupedMetrics.advanced.length > 0 && (
            <details className="group">
              <summary className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide cursor-pointer hover:text-text-primary transition-colors">
                Advanced Metrics
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {groupedMetrics.advanced.map((metric) => (
                  <div
                    key={metric.key}
                    className="bg-bg-secondary rounded-lg p-4 border border-border-default hover:border-primary-500/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${getColorClass(metric)}`}>
                        {metric.icon}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${getColorClass(metric)} mb-1`}>
                      {formatValue(metric.value, metric.format)}
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedMetrics;

