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
    const buySignals: { x: string[], y: number[] } = { x: [], y: [] };
    const sellSignals: { x: string[], y: number[] } = { x: [], y: [] };
    
    for (let i = 1; i < data.length; i++) {
      const prevPosition = data[i - 1].Position;
      const currentPosition = data[i].Position;
      
      if (prevPosition === 0 && currentPosition === 1) {
        // Buy signal
        buySignals.x.push(dates[i]);
        buySignals.y.push(prices[i]);
      } else if (prevPosition === 1 && currentPosition === 0) {
        // Sell signal
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
        },
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
        },
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

  // Memoize layout - match Full Cycle Model styling
  const layout = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const yaxisType: 'log' | 'linear' = useLogScale ? 'log' : 'linear';
    
    return {
      title: {
        text: title,
        font: { color: '#FFFFFF', size: isMobile ? 18 : 24 },
        x: 0.5,
      },
      xaxis: {
        title: 'Date',
        type: 'date' as const,
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
      },
      hovermode: 'x unified' as const,
      showlegend: !isMobile && showOverlayLegend,
      legend: {
        x: 1.02,
        y: 1,
        bgcolor: 'rgba(0, 0, 0, 0)',
        bordercolor: '#374151',
        borderwidth: 1,
        font: { color: '#FFFFFF' },
      },
      margin: {
        l: isMobile ? 50 : 60,
        r: isMobile ? 10 : 80,
        t: isMobile ? 50 : 80,
        b: isMobile ? 60 : 60,
      },
      plot_bgcolor: 'rgba(0, 0, 0, 0)',
      paper_bgcolor: 'rgba(0, 0, 0, 0)',
      font: {
        color: '#9CA3AF',
        size: isMobile ? 10 : 12,
      },
      dragmode: 'pan' as const,
    };
  }, [title, height, showOverlayLegend, useLogScale]);

  // Memoize config - match Full Cycle Model
  const config = useMemo(() => ({
    displayModeBar: false, // Hide default mode bar, we'll add custom toggle
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'price-chart',
      height: height,
      width: 1200,
      scale: 2,
    },
  }), [height]);

  return (
    <div className="relative bg-bg-tertiary rounded-lg border border-border-default p-6">
      {/* Log Scale Toggle Button - Top Right */}
      <button
        onClick={handleLogScaleToggle}
        className="absolute top-8 right-8 z-10 bg-bg-secondary hover:bg-bg-tertiary border border-border-default rounded px-3 py-1.5 text-sm text-text-primary transition-colors flex items-center gap-2"
        title={useLogScale ? 'Switch to Linear Scale' : 'Switch to Log Scale'}
      >
        <span>{useLogScale ? 'Linear' : 'Log'}</span>
      </button>
      
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
      />
      
      {/* Custom CSS for dark tooltips */}
      <style>{`
        .js-plotly-plot .plotly .modebar {
          display: none !important;
        }
        .js-plotly-plot .plotly .hoverlayer .hovertext {
          background-color: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid #4B5563 !important;
          color: #F3F4F6 !important;
          font-family: Inter, system-ui, sans-serif !important;
        }
      `}</style>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(PriceChart);
