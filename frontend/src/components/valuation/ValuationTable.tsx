/**
 * Valuation Table Component
 * Displays current z-scores for selected indicators in a table format
 */

import React, { useMemo } from 'react';
import { ValuationDataPoint, ValuationIndicator } from '../../hooks/useValuation';

interface ValuationTableProps {
  data: ValuationDataPoint[];
  averages: Record<string, number>;
  availableIndicators: ValuationIndicator[];
  selectedIndicators: string[];
  overboughtThreshold: number;
  oversoldThreshold: number;
}

export const ValuationTable: React.FC<ValuationTableProps> = ({
  data,
  averages,
  availableIndicators,
  selectedIndicators,
  overboughtThreshold,
  oversoldThreshold,
}) => {
  // Get latest data point (most recent)
  const latestData = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  // Get indicator metadata
  const getIndicatorInfo = (indicatorId: string): ValuationIndicator | undefined => {
    return availableIndicators.find((ind) => ind.id === indicatorId);
  };

  // Determine status based on z-score
  const getStatus = (zscore: number): { label: string; color: string } => {
    if (zscore > overboughtThreshold) {
      return { label: 'Overbought', color: 'text-red-400' };
    } else if (zscore < oversoldThreshold) {
      return { label: 'Oversold', color: 'text-green-400' };
    } else {
      return { label: 'Fair', color: 'text-text-secondary' };
    }
  };

  // Get row background color based on z-score
  const getRowBgColor = (zscore: number): string => {
    if (zscore > overboughtThreshold) {
      return 'bg-red-500/10';
    } else if (zscore < oversoldThreshold) {
      return 'bg-green-500/10';
    }
    return '';
  };

  // Calculate overall average
  const overallAverage = useMemo(() => {
    if (selectedIndicators.length === 0) return 0;
    const sum = selectedIndicators.reduce((acc, id) => {
      return acc + (averages[id] || 0);
    }, 0);
    return sum / selectedIndicators.length;
  }, [averages, selectedIndicators]);

  if (!latestData || selectedIndicators.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <div className="text-center text-text-muted py-8">
          {selectedIndicators.length === 0
            ? 'Select indicators to view z-scores'
            : 'No data available'}
        </div>
      </div>
    );
  }

  // Group indicators by category
  const indicatorsByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ id: string; indicator: ValuationIndicator }>> = {
      technical: [],
      fundamental: [],
    };

    selectedIndicators.forEach((id) => {
      const indicator = getIndicatorInfo(id);
      if (indicator && latestData.indicators[id]) {
        if (grouped[indicator.category]) {
          grouped[indicator.category].push({ id, indicator });
        }
      }
    });

    return grouped;
  }, [selectedIndicators, latestData, availableIndicators]);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary">BTC Z-Score Valuation</h3>
        <p className="text-sm text-text-muted mt-1">
          Overall Average: <span className="font-medium text-text-primary">{overallAverage.toFixed(2)}</span> —{' '}
          {overallAverage > overboughtThreshold
            ? 'Overbought'
            : overallAverage < oversoldThreshold
            ? 'Oversold'
            : 'Fair Value'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">
                Indicator
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">
                Value
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">
                Z
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Technical Indicators */}
            {indicatorsByCategory.technical.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} className="py-2 px-4">
                    <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      Technicals
                    </div>
                  </td>
                </tr>
                {indicatorsByCategory.technical.map(({ id, indicator }) => {
                  const indicatorData = latestData.indicators[id];
                  if (!indicatorData) return null;

                  const status = getStatus(indicatorData.zscore);
                  const rowBg = getRowBgColor(indicatorData.zscore);

                  return (
                    <tr
                      key={id}
                      className={`border-b border-border-default/50 ${rowBg} transition-colors`}
                    >
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-text-primary">{indicator.name}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-primary">
                          {indicatorData.value.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            indicatorData.zscore > overboughtThreshold
                              ? 'text-red-400'
                              : indicatorData.zscore < oversoldThreshold
                              ? 'text-green-400'
                              : 'text-text-primary'
                          }`}
                        >
                          {indicatorData.zscore >= 0 ? '+' : ''}
                          {indicatorData.zscore.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm ${status.color}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* Fundamental Indicators */}
            {indicatorsByCategory.fundamental.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} className="py-2 px-4">
                    <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      Fundamentals
                    </div>
                  </td>
                </tr>
                {indicatorsByCategory.fundamental.map(({ id, indicator }) => {
                  const indicatorData = latestData.indicators[id];
                  if (!indicatorData) return null;

                  const status = getStatus(indicatorData.zscore);
                  const rowBg = getRowBgColor(indicatorData.zscore);

                  return (
                    <tr
                      key={id}
                      className={`border-b border-border-default/50 ${rowBg} transition-colors`}
                    >
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-text-primary">{indicator.name}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-primary">
                          {indicatorData.value.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            indicatorData.zscore > overboughtThreshold
                              ? 'text-red-400'
                              : indicatorData.zscore < oversoldThreshold
                              ? 'text-green-400'
                              : 'text-text-primary'
                          }`}
                        >
                          {indicatorData.zscore >= 0 ? '+' : ''}
                          {indicatorData.zscore.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm ${status.color}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* Average Row */}
            <tr className="border-t-2 border-border-default bg-bg-tertiary">
              <td className="py-3 px-4">
                <div className="text-sm font-semibold text-text-primary">Average</div>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm text-text-muted">-</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={`text-sm font-semibold ${
                    overallAverage > overboughtThreshold
                      ? 'text-red-400'
                      : overallAverage < oversoldThreshold
                      ? 'text-green-400'
                      : 'text-text-primary'
                  }`}
                >
                  {overallAverage >= 0 ? '+' : ''}
                  {overallAverage.toFixed(2)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`text-sm font-semibold ${
                    overallAverage > overboughtThreshold
                      ? 'text-red-400'
                      : overallAverage < oversoldThreshold
                      ? 'text-green-400'
                      : 'text-text-secondary'
                  }`}
                >
                  {overallAverage > overboughtThreshold
                    ? 'Overbought'
                    : overallAverage < oversoldThreshold
                    ? 'Oversold'
                    : 'Fair Value'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
