/**
 * Indicator Tabs Component
 * Container for switching between individual indicators and combined view
 */

import React from 'react';
import { IndividualIndicatorTab } from './IndividualIndicatorTab';
import { CombinedSignalsTab } from './CombinedSignalsTab';
import type { BacktestResult } from '../../services/api';

interface IndicatorTabsProps {
  selectedIndicators: Array<{ id: string; parameters: Record<string, any> }>;
  indicatorNames: Record<string, string>;
  activeTab: string; // indicator ID or 'combined'
  onTabChange: (tab: string) => void;
  priceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  individualResults: Record<string, BacktestResult>;
  combinedResult: BacktestResult | null;
  combinedSignals: number[];
  agreementStats: {
    total_points: number;
    agreement_by_point: Array<{
      date: string;
      long_count: number;
      short_count: number;
      total_count: number;
      combined_signal: number;
    }>;
  } | null;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  isLoading?: boolean;
}

export const IndicatorTabs: React.FC<IndicatorTabsProps> = ({
  selectedIndicators,
  indicatorNames,
  activeTab,
  onTabChange,
  priceData,
  individualResults,
  combinedResult,
  combinedSignals,
  agreementStats,
  threshold,
  onThresholdChange,
  isLoading = false,
}) => {
  const tabs = [
    ...selectedIndicators.map((ind) => ({
      id: ind.id,
      label: indicatorNames[ind.id] || ind.id,
    })),
    { id: 'combined', label: 'Combined' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-border-default mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'combined' ? (
          <CombinedSignalsTab
            indicatorIds={selectedIndicators.map((ind) => ind.id)}
            indicatorNames={indicatorNames}
            priceData={priceData}
            combinedResult={combinedResult}
            combinedSignals={combinedSignals}
            agreementStats={agreementStats}
            threshold={threshold}
            onThresholdChange={onThresholdChange}
            isLoading={isLoading}
          />
        ) : (
          selectedIndicators
            .filter((ind) => ind.id === activeTab)
            .map((indicator) => (
              <IndividualIndicatorTab
                key={indicator.id}
                indicatorId={indicator.id}
                indicatorName={indicatorNames[indicator.id] || indicator.id}
                priceData={priceData}
                result={individualResults[indicator.id] || null}
                isLoading={isLoading}
              />
            ))
        )}
      </div>
    </div>
  );
};
