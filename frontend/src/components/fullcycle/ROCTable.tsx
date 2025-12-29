/**
 * ROC Table Component
 * Displays Rate of Change values in a table format
 */

import React from 'react';
import { FullCycleIndicator, FullCycleDataPoint } from '../../hooks/useFullCycle';

// Custom indicator display order matching the PDF specification
const INDICATOR_DISPLAY_ORDER = [
  'mvrv',
  'bitcoin_thermocap',
  'nupl',
  'cvdd',
  'sopr',
  'rsi',
  'cci',
  'multiple_ma',
  'sharpe',
  'pi_cycle',
  'nhpf',
  'vwap'
];

// Order for averages (should appear at the end)
const AVERAGE_ORDER = [
  'fundamental_average',
  'technical_average',
  'average'
];

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

  // Get indicator category for color coding
  const getIndicatorCategory = (indicatorId: string): 'fundamental' | 'technical' | 'average' => {
    if (indicatorId === 'fundamental_average' || indicatorId === 'technical_average' || indicatorId === 'average') {
      return 'average';
    }
    const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
    return indicator?.category || 'technical';
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
      // Check if indicators are averages
      const aIsAverage = AVERAGE_ORDER.includes(a.indicatorId);
      const bIsAverage = AVERAGE_ORDER.includes(b.indicatorId);
      
      // Averages go at the end, in specific order
      if (aIsAverage && bIsAverage) {
        return AVERAGE_ORDER.indexOf(a.indicatorId) - AVERAGE_ORDER.indexOf(b.indicatorId);
      }
      if (aIsAverage) return 1; // Averages go to end
      if (bIsAverage) return -1; // Averages go to end
      
      // Regular indicators: sort by custom order
      const aIndex = INDICATOR_DISPLAY_ORDER.indexOf(a.indicatorId);
      const bIndex = INDICATOR_DISPLAY_ORDER.indexOf(b.indicatorId);
      
      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only A is in the order list, it comes first
      if (aIndex !== -1) return -1;
      // If only B is in the order list, it comes first
      if (bIndex !== -1) return 1;
      // If neither is in the order list, maintain original order (by name)
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
              const category = getIndicatorCategory(row.indicatorId);
              const nameColorClass = category === 'fundamental' 
                ? 'text-blue-500' 
                : category === 'technical' 
                ? 'text-orange-500' 
                : 'text-text-primary';
              
              return (
                <tr
                  key={row.indicatorId}
                  className="border-b border-border-default/50 hover:bg-bg-tertiary transition-colors"
                >
                  <td className={`py-3 px-4 font-medium ${nameColorClass}`}>{row.name}</td>
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

