/**
 * Price chart component with trading signals and indicators.
 */

import React, { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { EquityDataPoint } from '../../services/api';

interface PriceChartProps {
  data: EquityDataPoint[];
  title?: string;
  height?: number;
  overlaySignals?: Record<string, { buy: { x: string[], y: number[] }, sell: { x: string[], y: number[] } }>;
  showOverlayLegend?: boolean;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  title = "Bitcoin Price with Trading Signals",
  height = 500,
  overlaySignals = {},
  showOverlayLegend = true,
}) => {
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
      name: 'Bitcoin Price',
      line: {
        color: '#1f77b4',
        width: 2,
      },
    },
    {
      x: buySignals.x,
      y: buySignals.y,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Combined Buy',
      marker: {
        color: '#2ca02c',
        size: 10,
        symbol: 'triangle-up' as const,
      },
    },
    {
      x: sellSignals.x,
      y: sellSignals.y,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Combined Sell',
      marker: {
        color: '#d62728',
        size: 10,
        symbol: 'triangle-down' as const,
      },
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

  // Memoize layout
  const layout = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      title: {
        text: title,
        font: { size: isMobile ? 14 : 16 },
      },
      xaxis: {
        title: 'Date',
        type: 'date' as const,
      },
      yaxis: {
        title: 'Price ($)',
        tickformat: '$,.0f',
      },
      hovermode: 'x unified' as const,
      showlegend: !isMobile && showOverlayLegend,
      legend: {
        orientation: 'h' as const,
        y: -0.2,
      },
      margin: {
        t: isMobile ? 40 : 50,
        b: isMobile ? 60 : 80,
        l: isMobile ? 50 : 60,
        r: isMobile ? 10 : 20,
      },
      height: isMobile ? Math.min(height, 400) : height,
      font: { size: isMobile ? 10 : 12 },
      dragmode: 'pan' as const, // Better for mobile
    };
  }, [title, height, showOverlayLegend]);

  // Memoize config
  const config = useMemo(() => ({
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'] as any,
    responsive: true,
  }), []);

  return (
    <div className="bg-bg-tertiary rounded-lg border border-border-default p-6">
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(PriceChart);
