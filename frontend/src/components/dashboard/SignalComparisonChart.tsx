/**
 * Signal comparison chart showing signals from each strategy type over time.
 */

import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

interface SignalComparisonChartProps {
  combinedSignals: { dates: string[]; values: number[] };
  individualSignals: Record<string, { dates: string[]; values: number[] }>;
  height?: number;
}

export const SignalComparisonChart: React.FC<SignalComparisonChartProps> = ({
  combinedSignals,
  individualSignals,
  height = 300
}) => {
  const plotData = useMemo(() => {
    const traces: any[] = [];
    
    // Add individual strategy signals
    Object.entries(individualSignals).forEach(([name, signalData], index) => {
      traces.push({
        x: signalData.dates,
        y: signalData.values,
        type: 'scatter',
        mode: 'lines',
        name: name,
        line: { color: `hsl(${index * 60}, 70%, 50%)`, width: 2 },
        hovertemplate: `<b>${name}</b><br>Date: %{x}<br>Signal: %{y}<br><extra></extra>`
      });
    });
    
    // Add combined signal (thicker line)
    traces.push({
      x: combinedSignals.dates,
      y: combinedSignals.values,
      type: 'scatter',
      mode: 'lines',
      name: 'Combined',
      line: { color: '#FFFFFF', width: 3 },
      hovertemplate: '<b>Combined Signal</b><br>Date: %{x}<br>Signal: %{y}<br><extra></extra>'
    });
    
    return traces;
  }, [combinedSignals, individualSignals]);

  const layout = {
    title: {
      text: 'Signal Comparison',
      font: { color: '#E5E7EB', size: 16 },
      x: 0.5
    },
    xaxis: {
      title: 'Date',
      color: '#9CA3AF',
      gridcolor: '#374151',
      showgrid: true
    },
    yaxis: {
      title: 'Signal',
      color: '#9CA3AF',
      gridcolor: '#374151',
      showgrid: true,
      range: [-1.5, 1.5],
      tickmode: 'array' as const,
      tickvals: [-1, 0, 1],
      ticktext: ['Sell', 'Hold', 'Buy']
    },
    plot_bgcolor: '#111827',
    paper_bgcolor: '#1F2937',
    font: { color: '#E5E7EB' },
    legend: {
      bgcolor: 'rgba(31, 41, 55, 0.8)',
      bordercolor: '#374151',
      borderwidth: 1,
      font: { color: '#E5E7EB' }
    },
    margin: { t: 50, b: 50, l: 60, r: 30 },
    hovermode: 'x unified' as const,
    hoverlabel: {
      bgcolor: '#1F2937',
      bordercolor: '#374151',
      font: { color: '#E5E7EB' }
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <Plot
        data={plotData}
        layout={layout}
        config={{
          displayModeBar: false,
          responsive: true
        }}
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
};

