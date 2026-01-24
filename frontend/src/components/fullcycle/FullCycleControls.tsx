/**
 * Full Cycle Controls Component
 * Controls for selecting indicators, date range, and visibility settings
 */

import React, { useState } from 'react';
import { FullCycleIndicator, FullCycleDataPoint } from '../../hooks/useFullCycle';
import { useMobile } from '../../hooks/useMobile';
import { DateRangePicker } from '../DateRangePicker';
import { ROCTable } from './ROCTable';
import { IndicatorParameterControls } from './IndicatorParameterControls';
import { PresetManager } from './PresetManager';
import TradingAPI from '../../services/api';
import { Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { SymbolExchangeControls } from '../SymbolExchangeControls';

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
  symbol: string;
  setSymbol: (symbol: string) => void;
  exchange: string;
  setExchange: (exchange: string) => void;
  timeframe: string;
  setTimeframe: (timeframe: string) => void;
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
  symbol,
  setSymbol,
  exchange,
  setExchange,
  timeframe,
  setTimeframe,
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
  const [testingCoinGlass, setTestingCoinGlass] = useState(false);
  const [coinGlassTestResult, setCoinGlassTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Group indicators by category
  const fundamentalIndicators = availableIndicators.filter((ind) => ind.category === 'fundamental');
  const technicalIndicators = availableIndicators.filter((ind) => ind.category === 'technical');

  const handleTestCoinGlass = async () => {
    setTestingCoinGlass(true);
    setCoinGlassTestResult(null);
    try {
      const result = await TradingAPI.testCoinGlassConnection();
      if (result.connection_test.success) {
        setCoinGlassTestResult({
          success: true,
          message: `✓ CoinGlass API connection successful! Endpoint: ${result.connection_test.endpoint}`,
          details: result,
        });
      } else {
        setCoinGlassTestResult({
          success: false,
          message: `✗ CoinGlass API connection failed: ${result.connection_test.error || 'Unknown error'}`,
          details: result,
        });
      }
    } catch (error: any) {
      setCoinGlassTestResult({
        success: false,
        message: `✗ Error testing CoinGlass: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`,
        details: error,
      });
    } finally {
      setTestingCoinGlass(false);
    }
  };

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
          symbol,
          exchange,
          timeframe,
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

      {/* Row 1: Market selection + Date Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleTestCoinGlass}
            disabled={testingCoinGlass}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border-default disabled:bg-bg-secondary/50 disabled:cursor-not-allowed text-text-primary rounded-lg text-sm transition-colors"
            title="Test CoinGlass API connection"
          >
            {testingCoinGlass ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                Test CoinGlass
              </>
            )}
          </button>
        </div>
        {coinGlassTestResult && (
          <div className={`p-3 rounded-lg border ${
            coinGlassTestResult.success
              ? 'bg-green-500/10 border-green-500/50 text-green-400'
              : 'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            <div className="flex items-start gap-2">
              {coinGlassTestResult.success ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{coinGlassTestResult.message}</p>
                {coinGlassTestResult.details && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer hover:underline">Show details</summary>
                    <pre className="mt-2 p-2 bg-bg-primary rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(coinGlassTestResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
        <SymbolExchangeControls
          symbol={symbol}
          onSymbolChange={setSymbol}
          exchange={exchange}
          onExchangeChange={setExchange}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onRefreshData={refreshData}
          isRefreshingData={isLoading}
          maxDaysRange={999}
          showDataInfo={false}
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

