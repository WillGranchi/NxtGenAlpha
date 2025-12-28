/**
 * Full Cycle Chart Component
 * Dual Y-axis Plotly chart showing BTC price (log scale) and indicator z-scores with reference lines
 */

import React, { useMemo, memo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { FullCycleDataPoint, FullCycleIndicator } from '../../hooks/useFullCycle';

interface FullCycleChartProps {
  data: FullCycleDataPoint[];
  availableIndicators: FullCycleIndicator[];
  selectedIndicators: string[];
  visibleIndicators: Set<string>;
  showFundamentalAverage?: boolean;
  showTechnicalAverage?: boolean;
  showOverallAverage?: boolean;
  sdcaIn?: number;
  sdcaOut?: number;
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
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#A855F7', // Violet
  '#84CC16', // Lime
];

// Magenta and Cyan for overbought/oversold
const MAGENTA = '#FF019A';
const CYAN = '#00F1FF';

export const FullCycleChart: React.FC<FullCycleChartProps> = memo(({
  data,
  availableIndicators,
  selectedIndicators,
  visibleIndicators,
  showFundamentalAverage = true,
  showTechnicalAverage = true,
  showOverallAverage = true,
  sdcaIn = -2.0,
  sdcaOut = 2.0,
  height = 600,
}) => {
  // Log scale state (default to log scale, persist in localStorage)
  const [useLogScale, setUseLogScale] = useState<boolean>(() => {
    const saved = localStorage.getItem('fullCycleChart_useLogScale');
    return saved !== null ? saved === 'true' : true; // Default to log scale
  });

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('fullCycleChart_useLogScale', String(useLogScale));
  }, [useLogScale]);
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const dates = data.map((d) => d.date);
    const prices = data.map((d) => d.price);

    // Prepare plot data
    const plotData: any[] = [];

    // Add BTC price trace (log scale)
    plotData.push({
      x: dates,
      y: prices,
      type: 'scatter',
      mode: 'lines',
      name: 'BTC Price',
      yaxis: 'y',
      line: {
        color: '#FFFFFF',
        width: 2,
      },
    });

    // Add indicator z-score traces
    // Add ALL selected indicators to plotData so they appear in tooltips
    // But only show them if they're explicitly in visibleIndicators
    // By default, only 'average' should be visible
    let colorIndex = 0;
    selectedIndicators.forEach((indicatorId) => {
      const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
      if (!indicator) return;

      const zscores = data.map((d) => {
        const indicatorData = d.indicators[indicatorId];
        return indicatorData ? indicatorData.zscore : null;
      });

      // Get color based on z-score gradient (cyan to magenta)
      // PineScript: color.from_gradient(zscore, -2, 2, cyan, magenta)
      const getColorForZscore = (zscore: number): string => {
        // Normalize z-score to 0-1 range (-2 to +2)
        const normalized = Math.max(-2, Math.min(2, zscore));
        const t = (normalized + 2) / 4; // 0 to 1
        
        // Interpolate between cyan (#00F1FF) and magenta (#FF019A)
        // Cyan: rgb(0, 241, 255)
        // Magenta: rgb(255, 1, 154)
        const r = Math.round(0 + (255 - 0) * t);
        const g = Math.round(241 + (1 - 241) * t);
        const b = Math.round(255 + (154 - 255) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
      };

      // Use average color for the line
      const avgZscore = zscores.filter(z => z !== null).reduce((sum, z) => sum + (z || 0), 0) / zscores.filter(z => z !== null).length;
      const lineColor = getColorForZscore(avgZscore || 0);

      // Add category prefix for visual distinction
      const categoryPrefix = indicator.category === 'fundamental' ? '[F] ' : '[T] ';
      const displayName = `${categoryPrefix}${indicator.name}`;
      
      plotData.push({
        x: dates,
        y: zscores,
        type: 'scatter',
        mode: 'lines',
        name: displayName,
        yaxis: 'y2',
        line: {
          color: lineColor,
          width: 1.5,
        },
        // Hide by default, but include in tooltips (legendonly = hidden but in tooltips)
        // Only show if explicitly in visibleIndicators
        visible: visibleIndicators.has(indicatorId) ? true : 'legendonly',
        // Ensure it appears in hover tooltips even when hidden
        showlegend: false, // Don't clutter legend with hidden indicators
      });

      colorIndex++;
    });

    // Add Fundamental Average
    if (showFundamentalAverage) {
      const fundamentalZscores = data.map((d) => {
        const avg = d.indicators['fundamental_average'];
        return avg ? avg.zscore : null;
      });

      plotData.push({
        x: dates,
        y: fundamentalZscores,
        type: 'scatter',
        mode: 'lines',
        name: 'Fundamental Average',
        yaxis: 'y2',
        line: {
          color: MAGENTA,
          width: 2,
          dash: 'dash',
        },
      });
    }

    // Add Technical Average
    if (showTechnicalAverage) {
      const technicalZscores = data.map((d) => {
        const avg = d.indicators['technical_average'];
        return avg ? avg.zscore : null;
      });

      plotData.push({
        x: dates,
        y: technicalZscores,
        type: 'scatter',
        mode: 'lines',
        name: 'Technical Average',
        yaxis: 'y2',
        line: {
          color: CYAN,
          width: 2,
          dash: 'dash',
        },
      });
    }

    // Add Overall Average
    if (showOverallAverage) {
      const overallZscores = data.map((d) => {
        const avg = d.indicators['average'];
        return avg ? avg.zscore : null;
      });

      plotData.push({
        x: dates,
        y: overallZscores,
        type: 'scatter',
        mode: 'lines',
        name: 'Average',
        yaxis: 'y2',
        line: {
          color: '#FFFFFF',
          width: 3,
        },
      });
    }

    // Add reference lines (horizontal lines at -3, -2, -1, 0, 1, 2, 3)
    const referenceLines = [-3, -2, -1, 0, 1, 2, 3];
    referenceLines.forEach((value) => {
      plotData.push({
        x: dates,
        y: Array(dates.length).fill(value),
        type: 'scatter',
        mode: 'lines',
        name: `${value}`,
        yaxis: 'y2',
        line: {
          color: value === 0 ? '#FFFFFF' : value > 0 ? MAGENTA : CYAN,
          width: value === 0 ? 1 : 0.5,
          dash: 'dash',
        },
        showlegend: false,
        hoverinfo: 'skip',
      });
    });

    return plotData;
  }, [data, availableIndicators, selectedIndicators, visibleIndicators, showFundamentalAverage, showTechnicalAverage, showOverallAverage, sdcaIn, sdcaOut]);

  const layout = useMemo(() => {
    if (!data || data.length === 0) return {};

    // Calculate SDCA highlighting regions based on average z-score
    // PineScript: bgcolor when Zplot > st (overbought) or Zplot < lt (oversold)
    const shapes: any[] = [];
    const dates = data.map((d) => d.date);
    
    // Find continuous regions where average z-score is above/below thresholds
    let inRegionStart: string | null = null;
    let outRegionStart: string | null = null;
    
    for (let i = 0; i < data.length; i++) {
      const avgZscore = data[i].indicators['average']?.zscore;
      if (avgZscore === undefined || avgZscore === null) continue;
      
      // SDCA In (oversold) - highlight when z-score < sdcaIn
      if (avgZscore < sdcaIn) {
        if (inRegionStart === null) {
          inRegionStart = dates[i];
        }
      } else {
        // End of SDCA In region
        if (inRegionStart !== null) {
          shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: inRegionStart,
            x1: dates[i],
            y0: 0,
            y1: 1,
            fillcolor: 'rgba(0, 241, 255, 0.15)', // Cyan with transparency
            line: { width: 0 },
            layer: 'below',
          });
          inRegionStart = null;
        }
      }
      
      // SDCA Out (overbought) - highlight when z-score > sdcaOut
      if (avgZscore > sdcaOut) {
        if (outRegionStart === null) {
          outRegionStart = dates[i];
        }
      } else {
        // End of SDCA Out region
        if (outRegionStart !== null) {
          shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: outRegionStart,
            x1: dates[i],
            y0: 0,
            y1: 1,
            fillcolor: 'rgba(255, 1, 154, 0.15)', // Magenta with transparency
            line: { width: 0 },
            layer: 'below',
          });
          outRegionStart = null;
        }
      }
    }
    
    // Handle regions that extend to the end of the data
    if (inRegionStart !== null) {
      shapes.push({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: inRegionStart,
        x1: dates[dates.length - 1],
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(0, 241, 255, 0.15)',
        line: { width: 0 },
        layer: 'below',
      });
    }
    
    if (outRegionStart !== null) {
      shapes.push({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: outRegionStart,
        x1: dates[dates.length - 1],
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(255, 1, 154, 0.15)',
        line: { width: 0 },
        layer: 'below',
      });
    }

    // Determine y-axis type
    const yaxisType: 'log' | 'linear' = useLogScale ? 'log' : 'linear';

    return {
      title: {
        text: 'Full Cycle Model',
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
        title: 'BTC Price (USD)',
        type: yaxisType,
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
        side: 'left' as const,
      },
      yaxis2: {
        title: 'Z-Score',
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
        side: 'right' as const,
        overlaying: 'y' as const,
        range: [-3.5, 3.5],
      },
      shapes: shapes,
      plot_bgcolor: 'rgba(0, 0, 0, 0)',
      paper_bgcolor: 'rgba(0, 0, 0, 0)',
      font: {
        color: '#9CA3AF',
      },
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
      hovermode: 'x unified' as const,
      // Customize hover tooltip styling
      hoverlabel: {
        bgcolor: 'rgba(31, 41, 55, 0.95)', // Dark gray background (gray-800)
        bordercolor: '#4B5563', // Gray-600 border
        font: {
          color: '#F3F4F6', // Light gray text (gray-100)
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
      },
    };
  }, [data, sdcaIn, sdcaOut, useLogScale]);

  const config = {
    displayModeBar: true,
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d'] as any,
    // Custom CSS for hover tooltips
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'full-cycle-model',
      height: height,
      width: 1200,
      scale: 1,
    },
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
        <div className="text-center text-text-muted">
          <p>No data available. Select indicators to view z-scores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4 relative">
      {/* Custom CSS for Plotly hover tooltips */}
      <style>{`
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
      {/* Log Scale Toggle Button - Top Right Corner */}
      <button
        onClick={() => setUseLogScale(!useLogScale)}
        className="absolute top-6 right-6 z-10 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-tertiary/80 border border-border-default rounded-lg text-text-primary text-sm font-medium transition-colors shadow-lg"
        title={useLogScale ? 'Switch to Linear Scale' : 'Switch to Log Scale'}
        aria-label={useLogScale ? 'Switch to Linear Scale' : 'Switch to Log Scale'}
      >
        {useLogScale ? 'Linear' : 'Log'}
      </button>
      <Plot
        data={chartData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
        useResizeHandler={true}
      />
    </div>
  );
});

FullCycleChart.displayName = 'FullCycleChart';

