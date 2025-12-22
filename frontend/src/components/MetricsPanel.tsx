/**
 * Metrics panel component displaying performance metrics.
 */

import React from 'react';
import { BacktestMetrics } from '../services/api';
import clsx from 'clsx';

interface MetricsPanelProps {
  metrics: BacktestMetrics;
  title?: string;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  title = "Performance Metrics",
}) => {
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number | undefined, decimals: number = 2) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  const getMetricColor = (value: number | undefined, type: 'return' | 'ratio' | 'drawdown') => {
    if (value === undefined || value === null) return 'text-gray-600';
    
    switch (type) {
      case 'return':
        return value > 0 ? 'text-success-600' : 'text-danger-600';
      case 'ratio':
        if (value > 2) return 'text-success-600';
        if (value > 1) return 'text-warning-600';
        return 'text-danger-600';
      case 'drawdown':
        return value > -0.1 ? 'text-success-600' : value > -0.2 ? 'text-warning-600' : 'text-danger-600';
      default:
        return 'text-gray-600';
    }
  };

  const metricCards = [
    {
      title: 'Total Return',
      value: formatPercentage(metrics.total_return),
      color: getMetricColor(metrics.total_return, 'return'),
      icon: '📈',
    },
    {
      title: 'CAGR',
      value: formatPercentage(metrics.cagr),
      color: getMetricColor(metrics.cagr, 'return'),
      icon: '📊',
    },
    {
      title: 'Sharpe Ratio',
      value: formatNumber(metrics.sharpe_ratio),
      color: getMetricColor(metrics.sharpe_ratio, 'ratio'),
      icon: '⚡',
    },
    {
      title: 'Sortino Ratio',
      value: formatNumber(metrics.sortino_ratio),
      color: getMetricColor(metrics.sortino_ratio, 'ratio'),
      icon: '🎯',
    },
    {
      title: 'Max Drawdown',
      value: formatPercentage(metrics.max_drawdown),
      color: getMetricColor(metrics.max_drawdown, 'drawdown'),
      icon: '📉',
    },
    {
      title: 'Win Rate',
      value: formatPercentage(metrics.win_rate),
      color: getMetricColor(metrics.win_rate, 'return'),
      icon: '🎯',
    },
    {
      title: 'Final Value',
      value: formatCurrency(metrics.final_portfolio_value),
      color: 'text-gray-600',
      icon: '💰',
    },
    {
      title: 'Total Trades',
      value: metrics.total_trades.toString(),
      color: 'text-gray-600',
      icon: '🔄',
    },
  ];

  const additionalMetrics = [
    {
      title: 'Profitable Trades',
      value: metrics.profitable_trades.toString(),
      color: 'text-success-600',
    },
    {
      title: 'Losing Trades',
      value: metrics.losing_trades.toString(),
      color: 'text-danger-600',
    },
    {
      title: 'Avg Trade Return',
      value: formatPercentage(metrics.avg_trade_return),
      color: getMetricColor(metrics.avg_trade_return, 'return'),
    },
  ];

  if (metrics.var_95 !== undefined) {
    additionalMetrics.push({
      title: 'VaR (95%)',
      value: formatPercentage(metrics.var_95),
      color: 'text-warning-600',
    });
  }

  if (metrics.cvar_95 !== undefined) {
    additionalMetrics.push({
      title: 'CVaR (95%)',
      value: formatPercentage(metrics.cvar_95),
      color: 'text-warning-600',
    });
  }

  if (metrics.calmar_ratio !== undefined) {
    additionalMetrics.push({
      title: 'Calmar Ratio',
      value: formatNumber(metrics.calmar_ratio),
      color: getMetricColor(metrics.calmar_ratio, 'ratio'),
    });
  }

  if (metrics.omega_ratio !== undefined) {
    additionalMetrics.push({
      title: 'Omega Ratio',
      value: formatNumber(metrics.omega_ratio),
      color: getMetricColor(metrics.omega_ratio, 'ratio'),
    });
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>
      
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{metric.icon}</span>
              <span className={clsx('text-lg font-semibold', metric.color)}>
                {metric.value}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      {additionalMetrics.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {additionalMetrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">{metric.title}</span>
                <span className={clsx('text-sm font-medium', metric.color)}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Performance Summary</h3>
        <div className="text-sm text-blue-800">
          {metrics.total_return !== undefined && metrics.total_return > 0 ? (
            <p>
              The strategy generated a <strong>{formatPercentage(metrics.total_return)}</strong> total return
              with a <strong>{formatNumber(metrics.sharpe_ratio)}</strong> Sharpe ratio.
              {metrics.max_drawdown !== undefined && metrics.max_drawdown < -0.1 && (
                <span className="text-orange-600">
                  {' '}Note: Maximum drawdown was {formatPercentage(metrics.max_drawdown)}.
                </span>
              )}
            </p>
          ) : (
            <p>
              The strategy resulted in a <strong>{formatPercentage(metrics.total_return)}</strong> total return
              with a <strong>{formatNumber(metrics.sharpe_ratio)}</strong> Sharpe ratio.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
