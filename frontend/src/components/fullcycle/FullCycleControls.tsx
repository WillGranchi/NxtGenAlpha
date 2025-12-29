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
  sdcaIn: number;
  setSdcaIn: (value: number) => void;
  sdcaOut: number;
  setSdcaOut: (value: number) => void;
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
    sdca_in?: number;
    sdca_out?: number;
  }) => void;
  refreshData: () => Promise<void>;
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
  sdcaIn,
  setSdcaIn,
  sdcaOut,
  setSdcaOut,
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
  refreshData,
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

  const handleSelectAllFundamental = () => {
    const fundamentalIds = fundamentalIndicators.map((ind) => ind.id);
    setSelectedIndicators([...selectedIndicators.filter(id => !fundamentalIds.includes(id)), ...fundamentalIds]);
    setVisibleIndicators(new Set([...Array.from(visibleIndicators), ...fundamentalIds]));
  };

  const handleDeselectAllFundamental = () => {
    const fundamentalIds = fundamentalIndicators.map((ind) => ind.id);
    setSelectedIndicators(selectedIndicators.filter(id => !fundamentalIds.includes(id)));
    const newVisible = new Set(visibleIndicators);
    fundamentalIds.forEach(id => newVisible.delete(id));
    setVisibleIndicators(newVisible);
  };

  const handleSelectAllTechnical = () => {
    const technicalIds = technicalIndicators.map((ind) => ind.id);
    setSelectedIndicators([...selectedIndicators.filter(id => !technicalIds.includes(id)), ...technicalIds]);
    setVisibleIndicators(new Set([...Array.from(visibleIndicators), ...technicalIds]));
  };

  const handleDeselectAllTechnical = () => {
    const technicalIds = technicalIndicators.map((ind) => ind.id);
    setSelectedIndicators(selectedIndicators.filter(id => !technicalIds.includes(id)));
    const newVisible = new Set(visibleIndicators);
    technicalIds.forEach(id => newVisible.delete(id));
    setVisibleIndicators(newVisible);
  };

  return (
    <div className="space-y-6 transition-all duration-200">
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
          sdca_in: sdcaIn,
          sdca_out: sdcaOut,
        }}
      />

      {/* Row 1: Date Range and Refresh */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-text-secondary">
            Date Range
          </label>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            title="Refresh price data and recalculate indicators"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Row 2: ROC Period, SDCA Thresholds, and Averages */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {/* SDCA Thresholds */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              SDCA Thresholds
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-text-muted mb-1">SDCA In (Oversold)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sdcaIn}
                  onChange={(e) => setSdcaIn(parseFloat(e.target.value) || -2)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">SDCA Out (Overbought)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sdcaOut}
                  onChange={(e) => setSdcaOut(parseFloat(e.target.value) || 2)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>
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

      {/* Row 3: ROC Table - Always render to maintain layout */}
      <div className="min-h-[200px]">
        {Object.keys(roc).length > 0 ? (
          <ROCTable
            roc={roc}
            zscoreData={zscoreData}
            availableIndicators={availableIndicators}
            selectedIndicators={selectedIndicators}
            rocDays={rocDays}
          />
        ) : (
          <div className="bg-bg-secondary border border-border-default rounded-lg p-4 animate-pulse">
            <div className="h-32 bg-bg-tertiary rounded"></div>
          </div>
        )}
      </div>

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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-primary">Fundamental</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllFundamental}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    disabled={isLoading}
                  >
                    Select All
                  </button>
                  <span className="text-xs text-text-muted">|</span>
                  <button
                    onClick={handleDeselectAllFundamental}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    disabled={isLoading}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {fundamentalIndicators.map((indicator) => {
                  const isSelected = selectedIndicators.includes(indicator.id);
                  const isVisible = visibleIndicators.has(indicator.id);
                  return (
                    <div key={indicator.id} className="space-y-2">
                      <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3 py-1 rounded-r">
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
                            className={`text-xs px-2 py-1 rounded transition-all duration-200 ${
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
                      <div className={`transition-all duration-200 overflow-hidden ${isSelected ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {isSelected && (
                          <IndicatorParameterControls
                            indicator={indicator}
                            parameters={indicatorParameters[indicator.id] || {}}
                            onParameterChange={updateIndicatorParameter}
                            isLoading={isLoading}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical Indicators */}
          {technicalIndicators.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-primary">Technical</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllTechnical}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    disabled={isLoading}
                  >
                    Select All
                  </button>
                  <span className="text-xs text-text-muted">|</span>
                  <button
                    onClick={handleDeselectAllTechnical}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    disabled={isLoading}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {technicalIndicators.map((indicator) => {
                  const isSelected = selectedIndicators.includes(indicator.id);
                  const isVisible = visibleIndicators.has(indicator.id);
                  return (
                    <div key={indicator.id} className="space-y-2">
                      <div className="flex items-center gap-2 border-l-4 border-orange-500 pl-3 py-1 rounded-r">
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
                            className={`text-xs px-2 py-1 rounded transition-all duration-200 ${
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
                      <div className={`transition-all duration-200 overflow-hidden ${isSelected ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {isSelected && (
                          <IndicatorParameterControls
                            indicator={indicator}
                            parameters={indicatorParameters[indicator.id] || {}}
                            onParameterChange={updateIndicatorParameter}
                            isLoading={isLoading}
                          />
                        )}
                      </div>
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

