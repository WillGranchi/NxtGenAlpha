/**
 * Unified price chart showing combined signals from all selected strategies.
 */

import React, { useMemo } from 'react';
import { PriceChart } from '../charts/PriceChart';
import { EquityDataPoint } from '../../services/api';

interface UnifiedPriceChartProps {
  priceData: EquityDataPoint[];
  combinedSignals: { dates: string[]; values: number[] };
  individualSignals: Record<string, { dates: string[]; values: number[] }>;
  title?: string;
}

export const UnifiedPriceChart: React.FC<UnifiedPriceChartProps> = ({
  priceData,
  combinedSignals,
  individualSignals,
  title = "Combined Strategy Signals"
}) => {
  // Convert combined signals to overlay format
  const overlaySignals = useMemo(() => {
    const signals: Record<string, { buy: { x: string[]; y: number[] }; sell: { x: string[]; y: number[] } }> = {};
    
    // Add combined signal
    const combinedBuy: string[] = [];
    const combinedBuyPrices: number[] = [];
    const combinedSell: string[] = [];
    const combinedSellPrices: number[] = [];
    
    for (let i = 0; i < combinedSignals.dates.length; i++) {
      const date = combinedSignals.dates[i];
      const signal = combinedSignals.values[i];
      const pricePoint = priceData.find(p => p.Date === date);
      
      if (pricePoint) {
        if (signal === 1 && (i === 0 || combinedSignals.values[i - 1] !== 1)) {
          combinedBuy.push(date);
          combinedBuyPrices.push(pricePoint.Price);
        } else if (signal === -1 && (i === 0 || combinedSignals.values[i - 1] !== -1)) {
          combinedSell.push(date);
          combinedSellPrices.push(pricePoint.Price);
        }
      }
    }
    
    signals['Combined'] = {
      buy: { x: combinedBuy, y: combinedBuyPrices },
      sell: { x: combinedSell, y: combinedSellPrices }
    };
    
    // Add individual strategy signals
    Object.entries(individualSignals).forEach(([name, signalData]) => {
      const buy: string[] = [];
      const buyPrices: number[] = [];
      const sell: string[] = [];
      const sellPrices: number[] = [];
      
      for (let i = 0; i < signalData.dates.length; i++) {
        const date = signalData.dates[i];
        const signal = signalData.values[i];
        const pricePoint = priceData.find(p => p.Date === date);
        
        if (pricePoint) {
          if (signal === 1 && (i === 0 || signalData.values[i - 1] !== 1)) {
            buy.push(date);
            buyPrices.push(pricePoint.Price);
          } else if (signal === -1 && (i === 0 || signalData.values[i - 1] !== -1)) {
            sell.push(date);
            sellPrices.push(pricePoint.Price);
          }
        }
      }
      
      signals[name] = {
        buy: { x: buy, y: buyPrices },
        sell: { x: sell, y: sellPrices }
      };
    });
    
    return signals;
  }, [combinedSignals, individualSignals, priceData]);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      <PriceChart
        data={priceData}
        overlaySignals={overlaySignals}
        showOverlayLegend={true}
        height={500}
      />
    </div>
  );
};

