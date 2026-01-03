/**
 * Candlestick Chart Component
 * Displays OHLC price data as candlesticks with optional volume bars
 */

import React, { useMemo, memo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: PriceDataPoint[];
  title?: string;
  height?: number;
  showVolume?: boolean;
  useLogScale?: boolean;
  onLogScaleToggle?: (useLog: boolean) => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = memo(({
  data,
  title = "Bitcoin Price (OHLC)",
  height = 600,
  showVolume = true,
  useLogScale: externalUseLogScale,
  onLogScaleToggle,
}) => {
  // Log scale state (default to log scale, persist in localStorage)
  const [internalUseLogScale, setInternalUseLogScale] = useState<boolean>(() => {
    const saved = localStorage.getItem('candlestickChart_useLogScale');
    return saved !== null ? saved === 'true' : true; // Default to log scale
  });

  // Use external prop if provided, otherwise use internal state
  const useLogScale = externalUseLogScale !== undefined ? externalUseLogScale : internalUseLogScale;

  // Save preference to localStorage
  useEffect(() => {
    if (externalUseLogScale === undefined) {
      localStorage.setItem('candlestickChart_useLogScale', String(internalUseLogScale));
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

  // Memoize chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const dates = data.map((d) => d.date);
    const opens = data.map((d) => d.open);
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const closes = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);

    const plotData: any[] = [];

    // Candlestick chart
    plotData.push({
      x: dates,
      open: opens,
      high: highs,
      low: lows,
      close: closes,
      type: 'candlestick',
      name: 'BTC Price',
      increasing: {
        line: { color: '#10B981' }, // Green for bullish candles
        fillcolor: '#10B981'
      },
      decreasing: {
        line: { color: '#EF4444' }, // Red for bearish candles
        fillcolor: '#EF4444'
      },
      yaxis: 'y',
      hovertemplate: '<b>%{fullData.name}</b><br>' +
        'Date: %{x}<br>' +
        'Open: $%{open:,.2f}<br>' +
        'High: $%{high:,.2f}<br>' +
        'Low: $%{low:,.2f}<br>' +
        'Close: $%{close:,.2f}<br>' +
        '<extra></extra>',
    });

    // Volume bars (if enabled)
    if (showVolume) {
      plotData.push({
        x: dates,
        y: volumes,
        type: 'bar',
        name: 'Volume',
        yaxis: 'y2',
        marker: {
          color: volumes.map((vol, i) => {
            // Green if close > open, red if close < open
            return closes[i] >= opens[i] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
          }),
        },
        hovertemplate: '<b>Volume</b><br>' +
          'Date: %{x}<br>' +
          'Volume: %{y:,.0f}<br>' +
          '<extra></extra>',
      });
    }

    return { plotData };
  }, [data, showVolume]);

  if (!chartData) {
    return (
      <div className="bg-bg-tertiary rounded-lg border border-border-default p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
        <p className="text-text-secondary">No data available</p>
      </div>
    );
  }

  const { plotData } = chartData;

  // Memoize layout - match Full Cycle Model styling
  const layout = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const yaxisType: 'log' | 'linear' = useLogScale ? 'log' : 'linear';
    
    const layoutConfig: any = {
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
        domain: showVolume ? [0, 0.75] : [0, 1], // Leave space for volume legend if shown
      },
      yaxis: {
        title: 'Price (USD)',
        type: yaxisType,
        tickformat: '$,.0f',
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
        side: 'right' as const,
      },
      hovermode: 'x unified' as const,
      hoverlabel: {
        bgcolor: 'rgba(31, 41, 55, 0.95)',
        bordercolor: '#4B5563',
        font: {
          color: '#F3F4F6',
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
      },
      showlegend: !isMobile,
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

    // Add volume y-axis if volume is shown
    if (showVolume) {
      layoutConfig.yaxis2 = {
        title: 'Volume',
        overlaying: 'y' as const,
        side: 'left' as const,
        color: '#6B7280',
        gridcolor: '#374151',
        showgrid: false,
      };
    }

    return layoutConfig;
  }, [title, height, showVolume, useLogScale]);

  // Memoize config - match Full Cycle Model
  const config = useMemo(() => ({
    displayModeBar: false,
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'candlestick-chart',
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
});

// Memoize component to prevent unnecessary re-renders
export default memo(CandlestickChart);

