/**
 * ROC Table Component
 * Displays Rate of Change values in a table format
 */

import React from 'react';
import { FullCycleIndicator, FullCycleDataPoint } from '../../hooks/useFullCycle';

// Custom indicator display order - Fundamental indicators first, then Technical
const FUNDAMENTAL_INDICATORS_ORDER = [
  'mvrv',
  'bitcoin_thermocap',
  'nupl',
  'cvdd',
  'sopr',
  'puell_multiple',
  'reserve_risk',
  'bitcoin_days_destroyed',
  'exchange_net_position',
];

const TECHNICAL_INDICATORS_ORDER = [
  'rsi',
  'cci',
  'multiple_ma',
  'sharpe',
  'pi_cycle',
  'nhpf',
  'vwap',
  'mayer_multiple',
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

  // Prepare table data with grouping
  const fundamentalData: typeof tableData = [];
  const technicalData: typeof tableData = [];
  const averagesData: typeof tableData = [];

  Object.entries(roc).forEach(([indicatorId, rocValue]) => {
    const currentZScore = getCurrentZScore(indicatorId);
    const rocPercent = currentZScore !== 0 ? (rocValue / Math.abs(currentZScore)) * 100 : 0;
    
    const item = {
      indicatorId,
      name: getIndicatorName(indicatorId),
      currentZScore,
      rocValue,
      rocPercent,
    };

    // Check if it's an average
    if (AVERAGE_ORDER.includes(indicatorId)) {
      averagesData.push(item);
    } else {
      // Check if it's fundamental or technical
      const fundIndex = FUNDAMENTAL_INDICATORS_ORDER.indexOf(indicatorId);
      const techIndex = TECHNICAL_INDICATORS_ORDER.indexOf(indicatorId);
      
      if (fundIndex !== -1) {
        fundamentalData.push({ ...item, sortOrder: fundIndex });
      } else if (techIndex !== -1) {
        technicalData.push({ ...item, sortOrder: techIndex });
      } else {
        // Unknown indicator - try to determine by category
        const category = getIndicatorCategory(indicatorId);
        if (category === 'fundamental') {
          fundamentalData.push({ ...item, sortOrder: 999 });
        } else {
          technicalData.push({ ...item, sortOrder: 999 });
        }
      }
    }
  });

  // Sort each group
  fundamentalData.sort((a, b) => (a as any).sortOrder - (b as any).sortOrder);
  technicalData.sort((a, b) => (a as any).sortOrder - (b as any).sortOrder);
  averagesData.sort((a, b) => AVERAGE_ORDER.indexOf(a.indicatorId) - AVERAGE_ORDER.indexOf(b.indicatorId));

  // Combine: Fundamental, Technical, Averages
  const tableData = [...fundamentalData, ...technicalData, ...averagesData];

  if (tableData.length === 0) {
    return null;
  }

  // Determine which group each row belongs to
  const getRowGroup = (indicatorId: string): 'fundamental' | 'technical' | 'average' => {
    if (AVERAGE_ORDER.includes(indicatorId)) return 'average';
    if (FUNDAMENTAL_INDICATORS_ORDER.includes(indicatorId)) return 'fundamental';
    if (TECHNICAL_INDICATORS_ORDER.includes(indicatorId)) return 'technical';
    return getIndicatorCategory(indicatorId);
  };

  let currentGroup: 'fundamental' | 'technical' | 'average' | null = null;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
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
            {tableData.map((row, index) => {
              const isPositive = row.rocValue > 0;
              const category = getIndicatorCategory(row.indicatorId);
              const nameColorClass = category === 'fundamental' 
                ? 'text-blue-500' 
                : category === 'technical' 
                ? 'text-orange-500' 
                : 'text-text-primary';
              
              const rowGroup = getRowGroup(row.indicatorId);
              const showGroupHeader = currentGroup !== rowGroup;
              if (showGroupHeader) {
                currentGroup = rowGroup;
              }
              
              return (
                <React.Fragment key={row.indicatorId}>
                  {showGroupHeader && (
                    <tr>
                      <td colSpan={4} className="py-3 px-4 bg-bg-tertiary/50 border-t border-b border-border-default">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${
                          rowGroup === 'fundamental' ? 'text-blue-400' :
                          rowGroup === 'technical' ? 'text-orange-400' :
                          'text-text-primary'
                        }`}>
                          {rowGroup === 'fundamental' ? 'Fundamental Indicators' :
                           rowGroup === 'technical' ? 'Technical Indicators' :
                           'Averages'}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-border-default/50 hover:bg-bg-tertiary transition-colors">
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

