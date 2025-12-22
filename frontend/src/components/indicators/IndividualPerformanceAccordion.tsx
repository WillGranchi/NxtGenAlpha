/**
 * Individual Performance Accordion Component
 * Displays individual indicator performance in accordion format
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { IndividualIndicatorTab } from './IndividualIndicatorTab';
import type { BacktestResult } from '../../services/api';

interface IndividualPerformanceAccordionProps {
  selectedIndicators: Array<{ id: string; parameters: Record<string, any> }>;
  indicatorNames: Record<string, string>;
  priceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  individualResults: Record<string, BacktestResult>;
  isLoading?: boolean;
}

export const IndividualPerformanceAccordion: React.FC<IndividualPerformanceAccordionProps> = ({
  selectedIndicators,
  indicatorNames,
  priceData,
  individualResults,
  isLoading = false,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (indicatorId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorId)) {
        newSet.delete(indicatorId);
      } else {
        newSet.add(indicatorId);
      }
      return newSet;
    });
  };

  // Update expanded items when selected indicators change
  React.useEffect(() => {
    if (selectedIndicators.length > 0) {
      // If no items expanded, expand first one
      if (expandedItems.size === 0) {
        setExpandedItems(new Set([selectedIndicators[0].id]));
      }
      // Remove expanded items for indicators that are no longer selected
      setExpandedItems((prev) => {
        const newSet = new Set<string>();
        prev.forEach((id) => {
          if (selectedIndicators.some((ind) => ind.id === id)) {
            newSet.add(id);
          }
        });
        // If nothing expanded after cleanup, expand first indicator
        if (newSet.size === 0 && selectedIndicators.length > 0) {
          newSet.add(selectedIndicators[0].id);
        }
        return newSet;
      });
    } else {
      setExpandedItems(new Set());
    }
  }, [selectedIndicators]);

  // Get current signal state for each indicator
  const getIndicatorSignalState = (indicatorId: string) => {
    if (!priceData || priceData.length === 0) return null;
    
    const lastPoint = priceData[priceData.length - 1];
    const position = lastPoint[`${indicatorId}_Position`] ?? lastPoint.Position ?? 0;
    
    return {
      signal: position,
      label: position === 1 ? 'LONG' : position === -1 ? 'SHORT' : 'CASH',
    };
  };

  // Get key metric for collapsed state
  const getKeyMetric = (indicatorId: string): string => {
    const result = individualResults[indicatorId];
    if (!result || !result.metrics) return 'No data';
    
    const totalReturn = result.metrics.total_return;
    if (totalReturn !== undefined) {
      return `Total Return: ${(totalReturn * 100).toFixed(2)}%`;
    }
    
    return 'View details';
  };

  if (selectedIndicators.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-8">
        <div className="text-center text-text-muted">
          <p>No indicators selected. Select indicators above to view individual performance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-text-primary mb-4">Individual Indicator Performance</h3>
      
      {selectedIndicators.map((indicator) => {
        const indicatorId = indicator.id;
        const indicatorName = indicatorNames[indicatorId] || indicatorId;
        const isExpanded = expandedItems.has(indicatorId);
        const result = individualResults[indicatorId];
        const signalState = getIndicatorSignalState(indicatorId);
        const keyMetric = getKeyMetric(indicatorId);

        return (
          <div
            key={indicatorId}
            className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden transition-all"
          >
            {/* Accordion Header */}
            <button
              onClick={() => toggleExpanded(indicatorId)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Chevron Icon */}
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-text-muted flex-shrink-0" />
                )}

                {/* Indicator Name */}
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-lg font-semibold text-text-primary">{indicatorName}</h4>
                  {!isExpanded && result && (
                    <p className="text-sm text-text-secondary mt-1">{keyMetric}</p>
                  )}
                </div>

                {/* Signal State Badge */}
                {signalState && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg flex-shrink-0 ${
                    signalState.signal === 1 ? 'bg-green-500/10 text-green-400' :
                    signalState.signal === -1 ? 'bg-red-500/10 text-red-400' :
                    'bg-text-secondary/10 text-text-secondary'
                  }`}>
                    {signalState.signal === 1 ? <TrendingUp className="w-4 h-4" /> :
                     signalState.signal === -1 ? <TrendingDown className="w-4 h-4" /> :
                     <Minus className="w-4 h-4" />}
                    <span className="text-sm font-medium">{signalState.label}</span>
                  </div>
                )}
              </div>
            </button>

            {/* Accordion Content */}
            {isExpanded && (
              <div className="border-t border-border-default p-6">
                {result ? (
                  <IndividualIndicatorTab
                    indicatorId={indicatorId}
                    indicatorName={indicatorName}
                    priceData={priceData}
                    result={result}
                    isLoading={isLoading}
                  />
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <p>No results available for {indicatorName}</p>
                    <p className="text-sm mt-2">Generate signals to view performance metrics</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
