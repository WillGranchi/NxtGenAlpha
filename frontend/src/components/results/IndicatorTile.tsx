import React from 'react';
import Plot from 'react-plotly.js';
import type { BacktestResult, EquityDataPoint } from '../../services/api';

interface IndicatorTileProps {
  indicatorId: string;
  indicatorName: string;
  result: BacktestResult;
  priceData: EquityDataPoint[];
  onToggleOverlay?: (indicatorId: string, show: boolean) => void;
  showOverlay?: boolean;
}

const IndicatorTile: React.FC<IndicatorTileProps> = ({
  indicatorId,
  indicatorName,
  result,
  priceData,
  onToggleOverlay,
  showOverlay = false,
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

  // Prepare price chart data with signals
  const preparePriceChartData = () => {
    if (!priceData || priceData.length === 0) return [];

    const dates = priceData.map(d => d.Date);
    const prices = priceData.map(d => d.Price);
    
    // Find buy and sell signals from this indicator's result
    const buySignals: { x: string[], y: number[] } = { x: [], y: [] };
    const sellSignals: { x: string[], y: number[] } = { x: [], y: [] };
    
    if (result.equity_curve && result.equity_curve.length > 0) {
      for (let i = 1; i < result.equity_curve.length; i++) {
        const prevPosition = result.equity_curve[i - 1].Position;
        const currentPosition = result.equity_curve[i].Position;
        
        if (prevPosition === 0 && currentPosition === 1) {
          // Buy signal
          buySignals.x.push(result.equity_curve[i].Date);
          buySignals.y.push(result.equity_curve[i].Price);
        } else if (prevPosition === 1 && currentPosition === 0) {
          // Sell signal
          sellSignals.x.push(result.equity_curve[i].Date);
          sellSignals.y.push(result.equity_curve[i].Price);
        }
      }
    }

    return [
      {
        x: dates,
        y: prices,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Price',
        line: {
          color: '#1f77b4',
          width: 1,
        },
        showlegend: false,
      },
      {
        x: buySignals.x,
        y: buySignals.y,
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: 'Buy',
        marker: {
          color: '#2ca02c',
          size: 6,
          symbol: 'triangle-up' as const,
        },
        showlegend: false,
      },
      {
        x: sellSignals.x,
        y: sellSignals.y,
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: 'Sell',
        marker: {
          color: '#d62728',
          size: 6,
          symbol: 'triangle-down' as const,
        },
        showlegend: false,
      },
    ];
  };

  // Prepare equity chart data
  const prepareEquityChartData = () => {
    if (!result.equity_curve || result.equity_curve.length === 0) return [];

    const dates = result.equity_curve.map(d => d.Date);
    const portfolioValues = result.equity_curve.map(d => d.Portfolio_Value);

    return [
      {
        x: dates,
        y: portfolioValues,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Equity',
        line: {
          color: '#1f77b4',
          width: 2,
        },
        showlegend: false,
      },
    ];
  };

  const priceChartData = preparePriceChartData();
  const equityChartData = prepareEquityChartData();

  const priceChartLayout = {
    title: {
      text: 'Price & Signals',
      font: { size: 12 },
    },
    xaxis: {
      showgrid: true,
      gridcolor: '#f0f0f0',
    },
    yaxis: {
      showgrid: true,
      gridcolor: '#f0f0f0',
      tickformat: '$,.0f',
    },
    margin: { t: 30, b: 20, l: 40, r: 10 },
    height: 200,
    showlegend: false,
  };

  const equityChartLayout = {
    title: {
      text: 'Equity Curve',
      font: { size: 12 },
    },
    xaxis: {
      showgrid: true,
      gridcolor: '#f0f0f0',
    },
    yaxis: {
      showgrid: true,
      gridcolor: '#f0f0f0',
      tickformat: '$,.0f',
    },
    margin: { t: 30, b: 20, l: 40, r: 10 },
    height: 200,
    showlegend: false,
  };

  const config = {
    displayModeBar: false,
    responsive: true,
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 text-center flex-1">{indicatorName}</h4>
          {onToggleOverlay && (
            <button
              onClick={() => onToggleOverlay(indicatorId, !showOverlay)}
              className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                showOverlay
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {showOverlay ? 'Hide' : 'Show'} on Chart
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {/* Price Chart */}
        <div className="min-h-[200px]">
          {priceChartData.length > 0 ? (
            <Plot
              data={priceChartData}
              layout={priceChartLayout}
              config={config}
              style={{ width: '100%', height: '200px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No data
            </div>
          )}
        </div>

        {/* Equity Chart */}
        <div className="min-h-[200px]">
          {equityChartData.length > 0 ? (
            <Plot
              data={equityChartData}
              layout={equityChartLayout}
              config={config}
              style={{ width: '100%', height: '200px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No data
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className={`text-lg font-bold ${getValueColor(result.metrics?.net_profit_pct)}`}>
              {formatValue(result.metrics?.net_profit_pct, 1, '%')}
            </div>
            <div className="text-xs text-gray-600">Net Profit</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-bold ${getValueColor(result.metrics?.max_drawdown_pct, false)}`}>
              {formatValue(result.metrics?.max_drawdown_pct, 1, '%')}
            </div>
            <div className="text-xs text-gray-600">Max DD</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-bold ${getValueColor(result.metrics?.sharpe_ratio)}`}>
              {formatValue(result.metrics?.sharpe_ratio, 2)}
            </div>
            <div className="text-xs text-gray-600">Sharpe</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-gray-700">
              {formatValue(result.metrics?.num_trades, 0)}
            </div>
            <div className="text-xs text-gray-600">Trades</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorTile;
