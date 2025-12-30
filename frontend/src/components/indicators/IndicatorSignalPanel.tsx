/**
 * Indicator Signal Panel Component
 * Displays horizontal lines for each selected indicator showing signal states over time
 * Green: Long, Red: Short, Orange: Neutral/Hold
 */

import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

interface IndicatorSignalPanelProps {
  indicators: Array<{ id: string; name: string }>;
  priceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  height?: number;
}

export const IndicatorSignalPanel: React.FC<IndicatorSignalPanelProps> = ({
  indicators,
  priceData,
  height = 200,
}) => {
  const plotData = useMemo(() => {
    if (!priceData || priceData.length === 0 || indicators.length === 0) {
      return [];
    }

    const dates = priceData.map((d) => d.Date);
    const traces: any[] = [];

    // Create one trace per indicator
    indicators.forEach((indicator, index) => {
      const indicatorId = indicator.id;
      const lineNumber = index + 1; // Line 1, 2, 3, etc.
      
      // Extract signal values for this indicator
      const signalValues = priceData.map((point) => {
        const position = point[`${indicatorId}_Position`] ?? point.Position ?? 0;
        // Map position to signal: 1 = Long (green), -1 = Short (red), 0 = Neutral (orange)
        return position;
      });

      // Create segments for each signal state to enable color changes
      let currentState = signalValues[0];
      let segmentStart = 0;
      const segments: Array<{ x: string[]; y: number[]; color: string; state: string }> = [];

      for (let i = 1; i < signalValues.length; i++) {
        if (signalValues[i] !== currentState || i === signalValues.length - 1) {
          // State changed or reached end, create segment
          const segmentEnd = i === signalValues.length - 1 ? i + 1 : i;
          const segmentDates = dates.slice(segmentStart, segmentEnd);
          const segmentY = Array(segmentDates.length).fill(lineNumber);
          
          let color: string;
          let state: string;
          if (currentState === 1) {
            color = '#10B981'; // Green for Long
            state = 'Long';
          } else if (currentState === -1) {
            color = '#EF4444'; // Red for Short
            state = 'Short';
          } else {
            color = '#F59E0B'; // Orange for Neutral/Hold
            state = 'Neutral';
          }

          segments.push({
            x: segmentDates,
            y: segmentY,
            color,
            state,
          });

          currentState = signalValues[i];
          segmentStart = i;
        }
      }

      // Create traces for each segment
      segments.forEach((segment, segmentIndex) => {
        traces.push({
          x: segment.x,
          y: segment.y,
          type: 'scatter',
          mode: 'lines',
          name: segmentIndex === 0 ? indicator.name : '', // Only show name on first segment
          line: {
            color: segment.color,
            width: 4,
          },
          showlegend: segmentIndex === 0, // Only show in legend once per indicator
          legendgroup: indicator.id,
          hovertemplate: `<b>${indicator.name}</b><br>Line ${lineNumber}<br>State: ${segment.state}<br>Date: %{x}<extra></extra>`,
          yaxis: 'y',
        });
      });
    });

    return traces;
  }, [indicators, priceData]);

  const layout = useMemo(() => {
    if (!priceData || priceData.length === 0 || indicators.length === 0) {
      return {};
    }

    const dates = priceData.map((d) => d.Date);
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    return {
      title: {
        text: 'Indicator Signals',
        font: { color: '#FFFFFF', size: 16 },
        x: 0.5,
      },
      xaxis: {
        title: 'Date',
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
        range: [minDate, maxDate],
      },
      yaxis: {
        title: 'Indicator',
        color: '#9CA3AF',
        gridcolor: '#374151',
        showgrid: true,
        tickmode: 'array' as const,
        tickvals: indicators.map((_, index) => index + 1),
        ticktext: indicators.map((ind, index) => `${index + 1}. ${ind.name}`),
        range: [0.5, indicators.length + 0.5],
        side: 'left' as const,
      },
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
        l: 120, // Extra left margin for indicator names
        r: 80,
        t: 60,
        b: 60,
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
    };
  }, [indicators, priceData]);

  const config = {
    displayModeBar: false,
    responsive: true,
    displaylogo: false,
  };

  if (!priceData || priceData.length === 0 || indicators.length === 0) {
    return null;
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: `${height}px` }}
        useResizeHandler={true}
      />
      {/* Legend for signal colors */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-text-secondary">Long</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-text-secondary">Short</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-text-secondary">Neutral/Hold</span>
        </div>
      </div>
    </div>
  );
};

