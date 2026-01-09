/**
 * Price chart component with trading signals and indicators.
 * Styled to match Full Cycle Model chart design.
 */

import React, { useMemo, memo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { EquityDataPoint } from '../../services/api';

interface PriceChartProps {
  data: EquityDataPoint[];
  title?: string;
  height?: number;
  overlaySignals?: Record<string, { buy: { x: string[], y: number[] }, sell: { x: string[], y: number[] } }>;
  showOverlayLegend?: boolean;
  useLogScale?: boolean;
  onLogScaleToggle?: (useLog: boolean) => void;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  title = "Bitcoin Price with Trading Signals",
  height = 500,
  overlaySignals = {},
  showOverlayLegend = true,
  useLogScale: externalUseLogScale,
  onLogScaleToggle,
}) => {
  // Log scale state (default to log scale, persist in localStorage)
  const [internalUseLogScale, setInternalUseLogScale] = useState<boolean>(() => {
    const saved = localStorage.getItem('priceChart_useLogScale');
    return saved !== null ? saved === 'true' : true; // Default to log scale
  });

  // Use external prop if provided, otherwise use internal state
  const useLogScale = externalUseLogScale !== undefined ? externalUseLogScale : internalUseLogScale;

  // Save preference to localStorage
  useEffect(() => {
    if (externalUseLogScale === undefined) {
      localStorage.setItem('priceChart_useLogScale', String(internalUseLogScale));
    }
  }, [internalUseLogScale, externalUseLogScale]);

  const handleLogScaleToggle = () => {
    const newValue = !useLogScale;
    if (onLogScaleToggle) {
      onLogScaleToggle(newValue);
    } else {
      setInternalUseLogScale(newValue);
    }
  };
  // Memoize data processing
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Prepare data for plotting
    const dates = data.map(d => d.Date);
    const prices = data.map(d => d.Price);
    
    // Find buy and sell signals
    // Buy signals: transitions to Long (1) from Neutral (0) or Short (-1)
    // Sell signals: transitions to Neutral (0) or Short (-1) from Long (1)
    const buySignals: { x: string[], y: number[] } = { x: [], y: [] };
    const sellSignals: { x: string[], y: number[] } = { x: [], y: [] };
    
    for (let i = 1; i < data.length; i++) {
      const prevPosition = data[i - 1].Position ?? 0;
      const currentPosition = data[i].Position ?? 0;
      
      // Buy signal: transition to Long (1) from Neutral (0) or Short (-1)
      if (prevPosition !== 1 && currentPosition === 1) {
        buySignals.x.push(dates[i]);
        buySignals.y.push(prices[i]);
      }
      // Sell signal: transition from Long (1) to Neutral (0) or Short (-1)
      else if (prevPosition === 1 && currentPosition !== 1) {
        sellSignals.x.push(dates[i]);
        sellSignals.y.push(prices[i]);
      }
    }

    // Generate colors for overlay signals
    const overlayColors = [
      '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    const plotData = [
    {
      x: dates,
      y: prices,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'BTC Price',
      line: {
        color: '#FFFFFF', // White like Full Cycle Model
        width: 2,
      },
      hovertemplate: '<b>%{fullData.name}</b><br>' +
        'Date: %{x}<br>' +
        'Price: $%{y:,.2f}<br>' +
        '<extra></extra>',
    },
    {
      x: buySignals.x,
      y: buySignals.y,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Combined Buy',
      marker: {
        color: '#10B981', // Green
        size: 12,
        symbol: 'triangle-up' as const,
        line: { color: '#FFFFFF', width: 1 },
      },
      hovertemplate: '<b>Buy Signal</b><br>' +
        'Date: %{x}<br>' +
        'Price: $%{y:,.2f}<br>' +
        '<extra></extra>',
    },
    {
      x: sellSignals.x,
      y: sellSignals.y,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Combined Sell',
      marker: {
        color: '#EF4444', // Red
        size: 12,
        symbol: 'triangle-down' as const,
        line: { color: '#FFFFFF', width: 1 },
      },
      hovertemplate: '<b>Sell Signal</b><br>' +
        'Date: %{x}<br>' +
        'Price: $%{y:,.2f}<br>' +
        '<extra></extra>',
    },
  ];

  // Add overlay signals
  Object.entries(overlaySignals).forEach(([indicatorId, signals], index) => {
    const color = overlayColors[index % overlayColors.length];
    
    if (signals.buy.x.length > 0) {
      plotData.push({
        x: signals.buy.x,
        y: signals.buy.y,
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: `${indicatorId} Buy`,
        marker: {
          color: color,
          size: 8,
          symbol: 'triangle-up' as const,
          line: { color: '#FFFFFF', width: 1 },
        },
        hovertemplate: `<b>${indicatorId} Buy Signal</b><br>` +
          'Date: %{x}<br>' +
          'Price: $%{y:,.2f}<br>' +
          '<extra></extra>',
      });
    }
    
    if (signals.sell.x.length > 0) {
      plotData.push({
        x: signals.sell.x,
        y: signals.sell.y,
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: `${indicatorId} Sell`,
        marker: {
          color: color,
          size: 8,
          symbol: 'triangle-down' as const,
          line: { color: '#FFFFFF', width: 1 },
        },
        hovertemplate: `<b>${indicatorId} Sell Signal</b><br>` +
          'Date: %{x}<br>' +
          'Price: $%{y:,.2f}<br>' +
          '<extra></extra>',
      });
    }
    });

    return { dates, prices, buySignals, sellSignals, plotData };
  }, [data, overlaySignals]);

  if (!chartData) {
    return (
      <div className="bg-bg-tertiary rounded-lg border border-border-default p-6">
        <div className="flex items-center justify-center h-64 text-text-muted">
          No data available for price chart
        </div>
      </div>
    );
  }

  const { plotData } = chartData;

  // Memoize layout - match Full Cycle Model styling exactly
  const layout = useMemo(() => {
    const yaxisType: 'log' | 'linear' = useLogScale ? 'log' : 'linear';
    
    return {
      title: {
        text: title,
        font: { color: '#FFFFFF', size: 24 },
        x: 0.5,
      },
      xaxis: {
        title: 'Date',
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
      },
      yaxis: {
        title: 'Price (USD)',
        type: yaxisType,
        tickformat: '$,.0f',
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
        side: 'left' as const,
      },
      hovermode: 'x unified' as const,
      hoverlabel: {
        bgcolor: 'rgba(31, 41, 55, 0.95)', // Dark gray background (gray-800)
        bordercolor: '#4B5563', // Gray-600 border
        font: {
          color: '#F3F4F6', // Light gray text (gray-100)
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
      },
      showlegend: showOverlayLegend,
      legend: {
        x: 1.02,
        y: 1,
        bgcolor: 'rgba(0, 0, 0, 0)',
        bordercolor: '#374151',
        borderwidth: 1,
        font: { color: '#FFFFFF' },
      },
      margin: {
        l: 60,
        r: 80,
        t: 80,
        b: 60,
      },
      plot_bgcolor: 'rgba(0, 0, 0, 0)',
      paper_bgcolor: 'rgba(0, 0, 0, 0)',
      font: {
        color: '#9CA3AF',
      },
    };
  }, [title, showOverlayLegend, useLogScale]);

  // Memoize config - match Full Cycle Model exactly
  const config = useMemo(() => ({
    displayModeBar: true,
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d'] as any,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'price-chart',
      height: height,
      width: 1200,
      scale: 1,
    },
    doubleClick: 'reset' as const,
  }), [height]);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4 relative transition-all duration-200">
      {/* Log Scale Toggle Button - Top Right Corner - Match Full Cycle Model exactly */}
      <button
        onClick={handleLogScaleToggle}
        className="absolute top-6 right-6 z-10 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-tertiary/80 border border-border-default rounded-lg text-text-primary text-sm font-medium transition-colors shadow-lg"
        title={useLogScale ? 'Switch to Linear Scale' : 'Switch to Log Scale'}
        aria-label={useLogScale ? 'Switch to Linear Scale' : 'Switch to Log Scale'}
      >
        {useLogScale ? 'Linear' : 'Log'}
      </button>
      
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
        useResizeHandler={true}
      />
      
      {/* Custom CSS for dark tooltips */}
      <style>{`
        .js-plotly-plot .plotly .modebar {
          display: none !important;
        }
        .js-plotly-plot .hoverlayer .hovertext {
          background-color: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid #4B5563 !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
          color: #F3F4F6 !important;
          font-family: 'Inter', system-ui, sans-serif !important;
          font-size: 12px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2) !important;
        }
        .js-plotly-plot .hoverlayer .hovertext .name {
          color: #F3F4F6 !important;
        }
        .js-plotly-plot .hoverlayer .hovertext .nums {
          color: #D1D5DB !important;
        }
      `}</style>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(PriceChart);
