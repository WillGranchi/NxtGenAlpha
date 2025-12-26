/**
 * Full Cycle Controls Component
 * Controls for selecting indicators, date range, and visibility settings
 */

import React from 'react';
import { FullCycleIndicator, FullCycleDataPoint } from '../../hooks/useFullCycle';
import { useMobile } from '../../hooks/useMobile';
import { DateRangePicker } from '../DateRangePicker';
import { ROCTable } from './ROCTable';
import { IndicatorParameterControls } from './IndicatorParameterControls';
import { PresetManager } from './PresetManager';

interface FullCycleControlsProps {
  availableIndicators: FullCycleIndicator[];
  selectedIndicators: string[];
  setSelectedIndicators: (indicators: string[]) => void;
  visibleIndicators: Set<string>;
  setVisibleIndicators: (indicators: Set<string>) => void;
  toggleIndicatorVisibility: (indicatorId: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  rocDays: number;
  setRocDays: (days: number) => void;
  showFundamentalAverage: boolean;
  setShowFundamentalAverage: (show: boolean) => void;
  showTechnicalAverage: boolean;
  setShowTechnicalAverage: (show: boolean) => void;
  showOverallAverage: boolean;
  setShowOverallAverage: (show: boolean) => void;
  isLoading?: boolean;
  zscoreData: FullCycleDataPoint[];
  roc: Record<string, number>;
  indicatorParameters: Record<string, Record<string, number>>;
  updateIndicatorParameter: (indicatorId: string, paramName: string, value: number) => void;
  loadPreset: (preset: {
    indicator_params: Record<string, Record<string, number>>;
    selected_indicators: string[];
    start_date?: string;
    end_date?: string;
    roc_days: number;
    show_fundamental_average: boolean;
    show_technical_average: boolean;
    show_overall_average: boolean;
  }) => void;
}

export const FullCycleControls: React.FC<FullCycleControlsProps> = ({
  availableIndicators,
  selectedIndicators,
  setSelectedIndicators,
  visibleIndicators,
  setVisibleIndicators,
  toggleIndicatorVisibility,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  rocDays,
  setRocDays,
  showFundamentalAverage,
  setShowFundamentalAverage,
  showTechnicalAverage,
  setShowTechnicalAverage,
  showOverallAverage,
  setShowOverallAverage,
  isLoading = false,
  zscoreData,
  roc,
  indicatorParameters,
  updateIndicatorParameter,
  loadPreset,
}) => {
  const { isMobile } = useMobile();

  // Group indicators by category
  const fundamentalIndicators = availableIndicators.filter((ind) => ind.category === 'fundamental');
  const technicalIndicators = availableIndicators.filter((ind) => ind.category === 'technical');

  const handleIndicatorToggle = (indicatorId: string) => {
    if (selectedIndicators.includes(indicatorId)) {
      setSelectedIndicators(selectedIndicators.filter((id) => id !== indicatorId));
    } else {
      setSelectedIndicators([...selectedIndicators, indicatorId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedIndicators(availableIndicators.map((ind) => ind.id));
    setVisibleIndicators(new Set(availableIndicators.map((ind) => ind.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIndicators([]);
    setVisibleIndicators(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Row 0: Preset Manager */}
      <PresetManager
        onLoadPreset={loadPreset}
        currentConfig={{
          indicator_params: indicatorParameters,
          selected_indicators: selectedIndicators,
          start_date: startDate,
          end_date: endDate,
          roc_days: rocDays,
          show_fundamental_average: showFundamentalAverage,
          show_technical_average: showTechnicalAverage,
          show_overall_average: showOverallAverage,
        }}
      />

      {/* Row 1: Date Range */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Date Range
        </label>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Row 2: ROC Period and Averages */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ROC Period */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              ROC Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={rocDays}
              onChange={(e) => setRocDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            />
          </div>

          {/* Averages Visibility */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Averages
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFundamentalAverage}
                  onChange={(e) => setShowFundamentalAverage(e.target.checked)}
                  className="w-4 h-4 text-primary-500 bg-bg-tertiary border-border-default rounded focus:ring-primary-500"
                  disabled={isLoading}
                />
                <span className="text-text-primary text-sm">Fundamental Average</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTechnicalAverage}
                  onChange={(e) => setShowTechnicalAverage(e.target.checked)}
                  className="w-4 h-4 text-primary-500 bg-bg-tertiary border-border-default rounded focus:ring-primary-500"
                  disabled={isLoading}
                />
                <span className="text-text-primary text-sm">Technical Average</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOverallAverage}
                  onChange={(e) => setShowOverallAverage(e.target.checked)}
                  className="w-4 h-4 text-primary-500 bg-bg-tertiary border-border-default rounded focus:ring-primary-500"
                  disabled={isLoading}
                />
                <span className="text-text-primary text-sm">Overall Average</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: ROC Table */}
      {Object.keys(roc).length > 0 && (
        <ROCTable
          roc={roc}
          zscoreData={zscoreData}
          availableIndicators={availableIndicators}
          selectedIndicators={selectedIndicators}
          rocDays={rocDays}
        />
      )}

      {/* Row 4: Indicator Selection and Parameter Controls */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-text-secondary">
            Indicators
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-primary-400 hover:text-primary-300"
              disabled={isLoading}
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-primary-400 hover:text-primary-300"
              disabled={isLoading}
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Indicator Selection and Parameters */}
        <div className="space-y-4">
          {/* Fundamental Indicators */}
          {fundamentalIndicators.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Fundamental</h4>
              <div className="space-y-2">
                {fundamentalIndicators.map((indicator) => {
                  const isSelected = selectedIndicators.includes(indicator.id);
                  const isVisible = visibleIndicators.has(indicator.id);
                  return (
                    <div key={indicator.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleIndicatorToggle(indicator.id)}
                          className="w-4 h-4 text-primary-500 bg-bg-tertiary border-border-default rounded focus:ring-primary-500"
                          disabled={isLoading}
                        />
                        <span className="flex-1 text-text-primary text-sm">{indicator.name}</span>
                        {isSelected && (
                          <button
                            onClick={() => toggleIndicatorVisibility(indicator.id)}
                            className={`text-xs px-2 py-1 rounded ${
                              isVisible
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-bg-tertiary text-text-secondary'
                            }`}
                            disabled={isLoading}
                          >
                            {isVisible ? 'Visible' : 'Hidden'}
                          </button>
                        )}
                      </div>
                      {isSelected && (
                        <IndicatorParameterControls
                          indicator={indicator}
                          parameters={indicatorParameters[indicator.id] || {}}
                          onParameterChange={updateIndicatorParameter}
                          isLoading={isLoading}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical Indicators */}
          {technicalIndicators.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Technical</h4>
              <div className="space-y-2">
                {technicalIndicators.map((indicator) => {
                  const isSelected = selectedIndicators.includes(indicator.id);
                  const isVisible = visibleIndicators.has(indicator.id);
                  return (
                    <div key={indicator.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleIndicatorToggle(indicator.id)}
                          className="w-4 h-4 text-primary-500 bg-bg-tertiary border-border-default rounded focus:ring-primary-500"
                          disabled={isLoading}
                        />
                        <span className="flex-1 text-text-primary text-sm">{indicator.name}</span>
                        {isSelected && (
                          <button
                            onClick={() => toggleIndicatorVisibility(indicator.id)}
                            className={`text-xs px-2 py-1 rounded ${
                              isVisible
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-bg-tertiary text-text-secondary'
                            }`}
                            disabled={isLoading}
                          >
                            {isVisible ? 'Visible' : 'Hidden'}
                          </button>
                        )}
                      </div>
                      {isSelected && (
                        <IndicatorParameterControls
                          indicator={indicator}
                          parameters={indicatorParameters[indicator.id] || {}}
                          onParameterChange={updateIndicatorParameter}
                          isLoading={isLoading}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

