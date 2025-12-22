/**
 * MetricsCard component for displaying backtest performance metrics.
 * Shows key performance indicators in a clean, responsive grid layout.
 */

import React from 'react';

interface MetricsCardProps {
  metrics: {
    total_return?: number;
    cagr?: number;
    sharpe_ratio?: number;
    sortino_ratio?: number;
    max_drawdown?: number;
    win_rate?: number;
    final_portfolio_value?: number;
    total_trades?: number;
    profitable_trades?: number;
    losing_trades?: number;
    avg_trade_return?: number;
    var_95?: number;
    cvar_95?: number;
    calmar_ratio?: number;
    omega_ratio?: number;
  };
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => {
  if (!metrics) return null;

  // Format number values for display
  const formatNumber = (value: number | undefined, type: 'percentage' | 'currency' | 'number' = 'number') => {
    if (value === undefined || value === null) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'number':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  // Define metric categories and their display properties
  const metricCategories = [
    {
      title: 'Returns',
      metrics: [
        { key: 'total_return', label: 'Total Return', value: metrics.total_return, type: 'percentage' as const },
        { key: 'cagr', label: 'CAGR', value: metrics.cagr, type: 'percentage' as const },
        { key: 'final_portfolio_value', label: 'Final Value', value: metrics.final_portfolio_value, type: 'currency' as const },
      ]
    },
    {
      title: 'Risk Metrics',
      metrics: [
        { key: 'sharpe_ratio', label: 'Sharpe Ratio', value: metrics.sharpe_ratio, type: 'number' as const },
        { key: 'sortino_ratio', label: 'Sortino Ratio', value: metrics.sortino_ratio, type: 'number' as const },
        { key: 'max_drawdown', label: 'Max Drawdown', value: metrics.max_drawdown, type: 'percentage' as const },
        { key: 'calmar_ratio', label: 'Calmar Ratio', value: metrics.calmar_ratio, type: 'number' as const },
      ]
    },
    {
      title: 'Trading Stats',
      metrics: [
        { key: 'total_trades', label: 'Total Trades', value: metrics.total_trades, type: 'number' as const },
        { key: 'win_rate', label: 'Win Rate', value: metrics.win_rate, type: 'percentage' as const },
        { key: 'profitable_trades', label: 'Winning Trades', value: metrics.profitable_trades, type: 'number' as const },
        { key: 'losing_trades', label: 'Losing Trades', value: metrics.losing_trades, type: 'number' as const },
      ]
    },
    {
      title: 'Advanced Metrics',
      metrics: [
        { key: 'avg_trade_return', label: 'Avg Trade Return', value: metrics.avg_trade_return, type: 'percentage' as const },
        { key: 'var_95', label: 'VaR (95%)', value: metrics.var_95, type: 'percentage' as const },
        { key: 'cvar_95', label: 'CVaR (95%)', value: metrics.cvar_95, type: 'percentage' as const },
        { key: 'omega_ratio', label: 'Omega Ratio', value: metrics.omega_ratio, type: 'number' as const },
      ]
    }
  ];

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Backtest Performance Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCategories.map((category) => (
          <div key={category.title} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              {category.title}
            </h3>
            <div className="space-y-3">
              {category.metrics.map((metric) => (
                <div key={metric.key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <span className={`text-sm font-medium ${
                    metric.key === 'total_return' || metric.key === 'cagr' || metric.key === 'win_rate' || metric.key === 'sharpe_ratio' || metric.key === 'sortino_ratio'
                      ? 'text-green-600'
                      : metric.key === 'max_drawdown' || metric.key === 'var_95' || metric.key === 'cvar_95'
                      ? 'text-red-600'
                      : 'text-gray-900'
                  }`}>
                    {formatNumber(metric.value, metric.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsCard;
