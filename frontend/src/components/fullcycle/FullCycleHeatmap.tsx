/**
 * Full Cycle Heatmap Component
 * Grid view showing all indicators color-coded by z-score
 */

import React from 'react';
import { FullCycleIndicator, FullCycleDataPoint } from '../../hooks/useFullCycle';

interface FullCycleHeatmapProps {
  data: FullCycleDataPoint[];
  availableIndicators: FullCycleIndicator[];
  selectedIndicators: string[];
  showFundamentalAverage?: boolean;
  showTechnicalAverage?: boolean;
  showOverallAverage?: boolean;
}

export const FullCycleHeatmap: React.FC<FullCycleHeatmapProps> = ({
  data,
  availableIndicators,
  selectedIndicators,
  showFundamentalAverage = false,
  showTechnicalAverage = false,
  showOverallAverage = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-12">
        <div className="text-center text-text-muted">
          <p>No data available. Select indicators to view heatmap.</p>
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1];

  // Get z-score color class
  const getZScoreColor = (zScore: number): string => {
    if (zScore < -1) return 'bg-green-500/20 border-green-500/50 text-green-400';
    if (zScore > 1) return 'bg-red-500/20 border-red-500/50 text-red-400';
    return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
  };

  // Get indicator name
  const getIndicatorName = (indicatorId: string): string => {
    if (indicatorId === 'fundamental_average') return 'Fundamental Average';
    if (indicatorId === 'technical_average') return 'Technical Average';
    if (indicatorId === 'average') return 'Overall Average';
    const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
    return indicator?.name || indicatorId;
  };

  // Get indicator category
  const getIndicatorCategory = (indicatorId: string): 'fundamental' | 'technical' | 'average' => {
    if (indicatorId === 'fundamental_average' || indicatorId === 'technical_average' || indicatorId === 'average') {
      return 'average';
    }
    const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
    return indicator?.category || 'technical';
  };

  // Prepare indicator list with averages
  const allIndicators: string[] = [...selectedIndicators];
  if (showFundamentalAverage) allIndicators.push('fundamental_average');
  if (showTechnicalAverage) allIndicators.push('technical_average');
  if (showOverallAverage) allIndicators.push('average');

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6 transition-all duration-200">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Indicator Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-max">
          {allIndicators.map((indicatorId) => {
            const zScore = latest?.indicators[indicatorId]?.zscore ?? null;
            const category = getIndicatorCategory(indicatorId);
            const name = getIndicatorName(indicatorId);
            const borderColor = category === 'fundamental' 
              ? 'border-l-4 border-blue-500' 
              : category === 'technical' 
              ? 'border-l-4 border-orange-500' 
              : 'border-l-4 border-purple-500';

            if (zScore === null) return null;

            return (
              <div
                key={indicatorId}
                className={`${getZScoreColor(zScore)} ${borderColor} border rounded-lg p-3 min-w-[180px]`}
              >
                <div className="text-xs font-medium mb-1 opacity-80">{name}</div>
                <div className="text-lg font-bold">{zScore.toFixed(2)}</div>
                <div className="text-xs mt-1 opacity-70">
                  {zScore < -1 ? 'Oversold' : zScore > 1 ? 'Overbought' : 'Neutral'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {allIndicators.length === 0 && (
        <div className="text-center text-text-muted py-8">
          <p>No indicators selected. Select indicators to view heatmap.</p>
        </div>
      )}
    </div>
  );
};

