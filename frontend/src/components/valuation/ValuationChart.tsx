/**
 * Valuation Chart Component
 * Dual Y-axis Plotly chart showing price (log scale) and z-scores with overbought/oversold bands
 */

import React, { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { ValuationDataPoint, ValuationIndicator } from '../../hooks/useValuation';

interface ValuationChartProps {
  data: ValuationDataPoint[];
  availableIndicators: ValuationIndicator[];
  selectedIndicators: string[];
  overboughtThreshold: number;
  oversoldThreshold: number;
  height?: number;
}

// Color palette for indicator lines
const INDICATOR_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

export const ValuationChart: React.FC<ValuationChartProps> = memo(({
  data,
  availableIndicators,
  selectedIndicators,
  overboughtThreshold,
  oversoldThreshold,
  height = 600,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const dates = data.map((d) => d.date);
    const prices = data.map((d) => d.price);

    // Prepare plot data
    const plotData: any[] = [];

    // Price line (right Y-axis, log scale)
    plotData.push({
      x: dates,
      y: prices,
      type: 'scatter',
      mode: 'lines',
      name: 'BTC Price',
      yaxis: 'y2',
      line: {
        color: '#3B82F6',
        width: 2,
        dash: 'dash',
      },
      hovertemplate: '<b>%{fullData.name}</b><br>' +
        'Date: %{x}<br>' +
        'Price: $%{y:,.2f}<br>' +
        '<extra></extra>',
    });

    // Z-score lines for each selected indicator (left Y-axis)
    selectedIndicators.forEach((indicatorId, index) => {
      const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
      if (!indicator) return;

      const zscores = data
        .map((d) => {
          const indData = d.indicators[indicatorId];
          return indData ? indData.zscore : null;
        })
        .filter((z) => z !== null);

      if (zscores.length === 0) return;

      const color = INDICATOR_COLORS[index % INDICATOR_COLORS.length];

      plotData.push({
        x: dates,
        y: data.map((d) => {
          const indData = d.indicators[indicatorId];
          return indData ? indData.zscore : null;
        }),
        type: 'scatter',
        mode: 'lines',
        name: `${indicator.name} Z-Score`,
        yaxis: 'y',
        line: {
          color: color,
          width: 2,
        },
        hovertemplate: `<b>${indicator.name} Z-Score</b><br>` +
          'Date: %{x}<br>' +
          'Z-Score: %{y:.2f}<br>' +
          '<extra></extra>',
      });
    });

    // Reference lines: thresholds and zero
    // Zero line
    plotData.push({
      x: [dates[0], dates[dates.length - 1]],
      y: [0, 0],
      type: 'scatter',
      mode: 'lines',
      name: 'Zero',
      yaxis: 'y',
      line: {
        color: '#E5E7EB',
        width: 1,
        dash: 'dot',
      },
      showlegend: false,
      hoverinfo: 'skip',
    });

    // Overbought threshold line
    plotData.push({
      x: [dates[0], dates[dates.length - 1]],
      y: [overboughtThreshold, overboughtThreshold],
      type: 'scatter',
      mode: 'lines',
      name: `Overbought (${overboughtThreshold})`,
      yaxis: 'y',
      line: {
        color: '#EF4444',
        width: 1,
        dash: 'dot',
      },
      showlegend: false,
      hoverinfo: 'skip',
    });

    // Oversold threshold line
    plotData.push({
      x: [dates[0], dates[dates.length - 1]],
      y: [oversoldThreshold, oversoldThreshold],
      type: 'scatter',
      mode: 'lines',
      name: `Oversold (${oversoldThreshold})`,
      yaxis: 'y',
      line: {
        color: '#10B981',
        width: 1,
        dash: 'dot',
      },
      showlegend: false,
      hoverinfo: 'skip',
    });

    // Overbought/oversold bands
    // Create shaded regions based on any selected indicator exceeding thresholds
    // We'll use the first selected indicator's z-scores to determine regions
    if (selectedIndicators.length > 0) {
      const firstIndicatorId = selectedIndicators[0];
      const zscores = data.map((d) => {
        const indData = d.indicators[firstIndicatorId];
        return indData ? indData.zscore : null;
      });

      // Find overbought regions (any point where z-score > threshold)
      const overboughtRegions: Array<{ start: number; end: number }> = [];
      let inOverboughtRegion = false;
      let overboughtStart = 0;

      for (let i = 0; i < zscores.length; i++) {
        const zscore = zscores[i];
        if (zscore === null) continue;

        if (zscore > overboughtThreshold && !inOverboughtRegion) {
          inOverboughtRegion = true;
          overboughtStart = i;
        } else if (zscore <= overboughtThreshold && inOverboughtRegion) {
          inOverboughtRegion = false;
          if (i > overboughtStart) {
            overboughtRegions.push({ start: overboughtStart, end: i });
          }
        }
      }
      if (inOverboughtRegion && overboughtStart < zscores.length) {
        overboughtRegions.push({ start: overboughtStart, end: zscores.length });
      }

      // Add overbought band regions
      overboughtRegions.forEach((region, idx) => {
        const regionDates = dates.slice(region.start, region.end);
        plotData.push({
          x: regionDates,
          y: new Array(regionDates.length).fill(3), // Fill to top of y-axis
          type: 'scatter',
          mode: 'lines',
          fill: 'tozeroy',
          fillcolor: 'rgba(239, 68, 68, 0.15)',
          line: { width: 0 },
          yaxis: 'y',
          showlegend: idx === 0,
          name: 'Overbought',
          legendgroup: 'overbought',
          hoverinfo: 'skip',
        });
      });

      // Find oversold regions
      const oversoldRegions: Array<{ start: number; end: number }> = [];
      let inOversoldRegion = false;
      let oversoldStart = 0;

      for (let i = 0; i < zscores.length; i++) {
        const zscore = zscores[i];
        if (zscore === null) continue;

        if (zscore < oversoldThreshold && !inOversoldRegion) {
          inOversoldRegion = true;
          oversoldStart = i;
        } else if (zscore >= oversoldThreshold && inOversoldRegion) {
          inOversoldRegion = false;
          if (i > oversoldStart) {
            oversoldRegions.push({ start: oversoldStart, end: i });
          }
        }
      }
      if (inOversoldRegion && oversoldStart < zscores.length) {
        oversoldRegions.push({ start: oversoldStart, end: zscores.length });
      }

      // Add oversold band regions
      oversoldRegions.forEach((region, idx) => {
        const regionDates = dates.slice(region.start, region.end);
        plotData.push({
          x: regionDates,
          y: new Array(regionDates.length).fill(-3), // Fill to bottom of y-axis
          type: 'scatter',
          mode: 'lines',
          fill: 'tozeroy',
          fillcolor: 'rgba(16, 185, 129, 0.15)',
          line: { width: 0 },
          yaxis: 'y',
          showlegend: idx === 0,
          name: 'Oversold',
          legendgroup: 'oversold',
          hoverinfo: 'skip',
        });
      });
    }

    return { plotData, dates, prices };
  }, [data, availableIndicators, selectedIndicators, overboughtThreshold, oversoldThreshold]);

  if (!chartData || chartData.plotData.length === 0) {
    return (
      <div className="bg-bg-tertiary rounded-lg border border-border-default p-6">
        <div className="flex items-center justify-center h-64 text-text-muted">
          {selectedIndicators.length === 0
            ? 'Select indicators to view chart'
            : 'No data available for chart'}
        </div>
      </div>
    );
  }

  const { plotData } = chartData;

  // Calculate price range for log scale
  const minPrice = Math.min(...chartData.prices.filter((p) => p > 0));
  const maxPrice = Math.max(...chartData.prices);

  const layout = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      title: {
        text: 'BTC Price + Z-Score Valuation',
        font: { size: isMobile ? 14 : 16, color: '#E5E7EB' },
      },
      xaxis: {
        title: 'Date',
        type: 'date' as const,
        gridcolor: '#374151',
        gridwidth: 1,
      },
      yaxis: {
        title: 'Z-Score',
        side: 'left' as const,
        position: 0,
        range: [-3, 3],
        gridcolor: '#374151',
        gridwidth: 1,
        tickfont: { color: '#E5E7EB' },
        titlefont: { color: '#E5E7EB' },
      },
      yaxis2: {
        title: 'BTC Price (Log Scale)',
        side: 'right' as const,
        position: 1,
        type: 'log' as const,
        range: [Math.log10(minPrice), Math.log10(maxPrice)],
        overlaying: 'y' as const,
        gridcolor: '#374151',
        gridwidth: 1,
        tickfont: { color: '#E5E7EB' },
        titlefont: { color: '#E5E7EB' },
      },
      hovermode: 'x unified' as const,
      showlegend: true,
      legend: {
        orientation: 'h' as const,
        y: -0.2,
        font: { color: '#E5E7EB' },
        bgcolor: 'rgba(0,0,0,0)',
      },
      margin: {
        t: isMobile ? 40 : 50,
        b: isMobile ? 60 : 80,
        l: isMobile ? 50 : 60,
        r: isMobile ? 50 : 60,
      },
      height: isMobile ? Math.min(height, 400) : height,
      font: { size: isMobile ? 10 : 12 },
      dragmode: 'pan' as const,
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
    };
  }, [height, minPrice, maxPrice]);

  const config = useMemo(
    () => ({
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'] as any,
      responsive: true,
    }),
    []
  );

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
});

ValuationChart.displayName = 'ValuationChart';
