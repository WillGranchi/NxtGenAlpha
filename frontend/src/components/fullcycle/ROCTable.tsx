/**
 * ROC Table Component
 * Displays Rate of Change values in a table format
 */

import React from 'react';
import { FullCycleIndicator, FullCycleDataPoint } from '../../hooks/useFullCycle';

interface ROCTableProps {
  roc: Record<string, number>;
  zscoreData: FullCycleDataPoint[];
  availableIndicators: FullCycleIndicator[];
  selectedIndicators: string[];
  rocDays: number;
}

export const ROCTable: React.FC<ROCTableProps> = ({
  roc,
  zscoreData,
  availableIndicators,
  selectedIndicators,
  rocDays,
}) => {
  // Get current z-scores for each indicator
  const getCurrentZScore = (indicatorId: string): number => {
    if (zscoreData.length === 0) return 0;
    const latest = zscoreData[zscoreData.length - 1];
    return latest.indicators[indicatorId]?.zscore || 0;
  };

  // Get indicator name
  const getIndicatorName = (indicatorId: string): string => {
    if (indicatorId === 'fundamental_average') return 'Fundamental Average';
    if (indicatorId === 'technical_average') return 'Technical Average';
    if (indicatorId === 'average') return 'Overall Average';
    const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
    return indicator?.name || indicatorId;
  };

  // Prepare table data
  const tableData = Object.entries(roc)
    .map(([indicatorId, rocValue]) => {
      const currentZScore = getCurrentZScore(indicatorId);
      const rocPercent = currentZScore !== 0 ? (rocValue / Math.abs(currentZScore)) * 100 : 0;
      
      return {
        indicatorId,
        name: getIndicatorName(indicatorId),
        currentZScore,
        rocValue,
        rocPercent,
      };
    })
    .sort((a, b) => {
      // Sort by category: averages first, then by name
      const aIsAverage = a.indicatorId.includes('average');
      const bIsAverage = b.indicatorId.includes('average');
      if (aIsAverage && !bIsAverage) return -1;
      if (!aIsAverage && bIsAverage) return 1;
      return a.name.localeCompare(b.name);
    });

  if (tableData.length === 0) {
    return null;
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {rocDays} Day Rate of Change
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left py-2 px-4 text-sm font-medium text-text-secondary">
                Indicator Name
              </th>
              <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">
                Current Z-Score
              </th>
              <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">
                ROC ({rocDays}d)
              </th>
              <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">
                ROC %
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => {
              const isPositive = row.rocValue > 0;
              return (
                <tr
                  key={row.indicatorId}
                  className="border-b border-border-default/50 hover:bg-bg-tertiary transition-colors"
                >
                  <td className="py-3 px-4 text-text-primary">{row.name}</td>
                  <td className="py-3 px-4 text-right text-text-primary">
                    {row.currentZScore.toFixed(2)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      isPositive ? 'text-magenta-400' : 'text-cyan-400'
                    }`}
                  >
                    {row.rocValue > 0 ? '+' : ''}
                    {row.rocValue.toFixed(2)} Z
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      isPositive ? 'text-magenta-400' : 'text-cyan-400'
                    }`}
                  >
                    {row.rocPercent > 0 ? '+' : ''}
                    {row.rocPercent.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

