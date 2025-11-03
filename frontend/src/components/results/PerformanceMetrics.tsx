import React from 'react';

interface PerformanceMetricsProps {
  metrics: {
    net_profit_pct?: number;
    max_drawdown_pct?: number;
    sharpe_ratio?: number;
    sortino_ratio?: number;
    omega_ratio?: number;
    profit_factor?: number;
    num_trades?: number;
  };
  title?: string;
  className?: string;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  title = "Performance Metrics",
  className = "",
}) => {
  const formatValue = (value: number | undefined, decimals: number = 2, suffix: string = '') => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'N/A';
    }
    return `${value.toFixed(decimals)}${suffix}`;
  };

  const getValueColor = (value: number | undefined, isPositive: boolean = true) => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'text-gray-500';
    }
    
    if (isPositive) {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return value <= 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  const metricItems = [
    {
      label: 'Net Profit',
      value: formatValue(metrics.net_profit_pct, 2, '%'),
      color: getValueColor(metrics.net_profit_pct),
      icon: '💰',
    },
    {
      label: 'Max Drawdown',
      value: formatValue(metrics.max_drawdown_pct, 2, '%'),
      color: getValueColor(metrics.max_drawdown_pct, false),
      icon: '📉',
    },
    {
      label: 'Sharpe Ratio',
      value: formatValue(metrics.sharpe_ratio, 3),
      color: getValueColor(metrics.sharpe_ratio),
      icon: '⚡',
    },
    {
      label: 'Sortino Ratio',
      value: formatValue(metrics.sortino_ratio, 3),
      color: getValueColor(metrics.sortino_ratio),
      icon: '🎯',
    },
    {
      label: 'Omega Ratio',
      value: formatValue(metrics.omega_ratio, 3),
      color: getValueColor(metrics.omega_ratio),
      icon: '🔄',
    },
    {
      label: 'Profit Factor',
      value: formatValue(metrics.profit_factor, 2),
      color: getValueColor(metrics.profit_factor),
      icon: '📊',
    },
    {
      label: 'Trades',
      value: formatValue(metrics.num_trades, 0),
      color: 'text-gray-700',
      icon: '📈',
    },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {/* Desktop: 7 columns, Mobile: 2-3 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {metricItems.map((item, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className={`text-2xl font-bold ${item.color} mb-1`}>
              {item.value}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceMetrics;
