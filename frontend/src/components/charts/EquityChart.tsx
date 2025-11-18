/**
 * Equity curve chart component showing portfolio performance.
 */

import React, { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { EquityDataPoint } from '../../services/api';

interface EquityChartProps {
  data: EquityDataPoint[];
  title?: string;
  height?: number;
  individualEquityData?: Record<string, EquityDataPoint[]>;
  showIndividualLegend?: boolean;
  strategyType?: 'long_cash' | 'long_short';
}

export const EquityChart: React.FC<EquityChartProps> = ({
  data,
  title = "Portfolio Equity Curve",
  height = 500,
  individualEquityData = {},
  showIndividualLegend = true,
  strategyType = 'long_cash',
}) => {
  // Memoize data processing to prevent recalculation on every render
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Prepare data for plotting
    const dates = data.map(d => d.Date);
    const portfolioValues = data.map(d => d.Portfolio_Value);
    const prices = data.map(d => d.Price);
    const positions = data.map(d => d.Position);
    
    // Calculate buy and hold performance
    const initialPrice = prices[0];
    const initialValue = portfolioValues[0];
    const buyAndHoldValues = prices.map(price => (price / initialPrice) * initialValue);
    
    // Create position-based colors for the strategy line
    const strategyColors = positions.map(position => {
      if (position === 1) return '#2ca02c'; // Green for long
      if (position === -1) return '#d62728'; // Red for short
      return '#ff7f0e'; // Orange for cash
    });

    return { dates, portfolioValues, prices, positions, buyAndHoldValues, strategyColors, initialValue };
  }, [data]);

  if (!chartData) {
    return (
      <div className="bg-bg-tertiary rounded-lg border border-border-default p-6">
        <div className="flex items-center justify-center h-64 text-text-muted">
          No data available for equity chart
        </div>
      </div>
    );
  }

  const { dates, portfolioValues, prices, positions, buyAndHoldValues, strategyColors } = chartData;

  // Memoize plot data to prevent recalculation
  const plotData = useMemo(() => {
    // Generate colors for individual equity curves
    const individualColors = [
      '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    const data = [
    {
      x: dates,
      y: portfolioValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Combined Strategy',
      line: {
        color: '#1f77b4',
        width: 3,
      },
      hovertemplate: '<b>Combined Strategy</b><br>' +
        'Date: %{x}<br>' +
        'Value: $%{y:,.0f}<br>' +
        '<extra></extra>',
    },
    {
      x: dates,
      y: buyAndHoldValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Buy & Hold',
      line: {
        color: '#ff7f0e',
        width: 2,
        dash: 'dash' as const,
      },
      hovertemplate: '<b>Buy & Hold</b><br>' +
        'Date: %{x}<br>' +
        'Value: $%{y:,.0f}<br>' +
        '<extra></extra>',
    },
    {
      x: dates,
      y: portfolioValues,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Position',
      marker: {
        color: strategyColors,
        size: 6,
        opacity: 0.7,
      },
      hovertemplate: '<b>Position</b><br>' +
        'Date: %{x}<br>' +
        'Value: $%{y:,.0f}<br>' +
        'Position: %{customdata}<br>' +
        '<extra></extra>',
      customdata: positions.map(pos => {
        if (pos === 1) return 'Long';
        if (pos === -1) return 'Short';
        return 'Cash';
      }),
      showlegend: false,
    },
    ];

    // Add individual equity curves
    Object.entries(individualEquityData).forEach(([indicatorId, equityData], index) => {
      if (equityData && equityData.length > 0) {
        const individualDates = equityData.map(d => d.Date);
        const individualValues = equityData.map(d => d.Portfolio_Value);
        const color = individualColors[index % individualColors.length];
        
        data.push({
          x: individualDates,
          y: individualValues,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: `${indicatorId} Strategy`,
          line: {
            color: color,
            width: 2,
            dash: 'dash' as const,
          },
          hovertemplate: `<b>${indicatorId} Strategy</b><br>` +
            'Date: %{x}<br>' +
            'Value: $%{y:,.0f}<br>' +
            '<extra></extra>',
        });
      }
    });

    return data;
  }, [dates, portfolioValues, positions, strategyColors, buyAndHoldValues, individualEquityData]);

  // Memoize layout to prevent recalculation
  const layout = useMemo(() => ({
    title: {
      text: title,
      font: { size: 16 },
    },
    xaxis: {
      title: 'Date',
      type: 'date' as const,
    },
    yaxis: {
      title: 'Portfolio Value ($)',
      tickformat: '$,.0f',
      // Allow negative values for long_short mode
      ...(strategyType === 'long_short' ? {} : { rangemode: 'tozero' }),
    },
    hovermode: 'x unified' as const,
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      y: -0.2,
    },
    margin: {
      t: 50,
      b: 80,
      l: 60,
      r: 20,
    },
    height,
    annotations: [
      {
        x: 0.02,
        y: 0.98,
        xref: 'paper' as const,
        yref: 'paper' as const,
        text: strategyType === 'long_short' 
          ? '🟢 Long | 🟠 Cash | 🔴 Short'
          : '🟢 Long | 🟠 Cash',
        showarrow: false,
        font: { size: 12 },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: 'rgba(0,0,0,0.2)',
        borderwidth: 1,
      },
    ],
  }), [title, height, strategyType]);

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
export default memo(EquityChart);
