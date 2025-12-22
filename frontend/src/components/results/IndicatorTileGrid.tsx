import React, { useState } from 'react';
import IndicatorTile from './IndicatorTile';
import type { BacktestResult, EquityDataPoint } from '../../services/api';

interface IndicatorTileGridProps {
  individualResults: Record<string, BacktestResult>;
  priceData: EquityDataPoint[];
  onToggleOverlay?: (indicatorId: string, show: boolean) => void;
  overlayStates?: Record<string, boolean>;
}

const IndicatorTileGrid: React.FC<IndicatorTileGridProps> = ({
  individualResults,
  priceData,
  onToggleOverlay,
  overlayStates = {},
}) => {
  const [expandedTile, setExpandedTile] = useState<string | null>(null);

  const handleToggleExpanded = (indicatorId: string) => {
    setExpandedTile(expandedTile === indicatorId ? null : indicatorId);
  };

  if (!individualResults || Object.keys(individualResults).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Indicator Results</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No individual indicator results available</p>
        </div>
      </div>
    );
  }

  const indicators = Object.entries(individualResults);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Individual Indicator Results ({indicators.length})
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Performance of each indicator individually. Click "Show on Chart" to overlay signals on the main price chart.
      </p>
      
      {/* Responsive Grid: 2 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {indicators.map(([indicatorId, result]) => {
          const isExpanded = expandedTile === indicatorId;
          const showOverlay = overlayStates[indicatorId] || false;
          
          return (
            <div key={indicatorId} className="relative">
              <IndicatorTile
                indicatorId={indicatorId}
                indicatorName={indicatorId}
                result={result}
                priceData={priceData}
                onToggleOverlay={onToggleOverlay}
                showOverlay={showOverlay}
              />
              
              {/* Expand/Collapse Button */}
              <button
                onClick={() => handleToggleExpanded(indicatorId)}
                className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Detailed Metrics</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Sortino Ratio</div>
                      <div className="font-medium">
                        {result.metrics?.sortino_ratio?.toFixed(3) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Omega Ratio</div>
                      <div className="font-medium">
                        {result.metrics?.omega_ratio?.toFixed(3) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Profit Factor</div>
                      <div className="font-medium">
                        {result.metrics?.profit_factor?.toFixed(2) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Trades</div>
                      <div className="font-medium">
                        {result.metrics?.num_trades || 0}
                      </div>
                    </div>
                  </div>
                  
                  {/* Trade Log Preview */}
                  {result.trade_log && result.trade_log.length > 0 && (
                    <div className="mt-4">
                      <h6 className="font-medium text-gray-900 mb-2">Recent Trades</h6>
                      <div className="max-h-32 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1">Date</th>
                              <th className="text-left py-1">Direction</th>
                              <th className="text-right py-1">Return</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.trade_log.slice(0, 5).map((trade, index) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-1">{trade.entry_date}</td>
                                <td className="py-1">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    trade.direction === 'LONG' 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {trade.direction}
                                  </span>
                                </td>
                                <td className="text-right py-1">
                                  <span className={
                                    (trade.return_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                  }>
                                    {(trade.return_pct || 0).toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {indicators.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No individual results to display</p>
        </div>
      )}
    </div>
  );
};

export default IndicatorTileGrid;
