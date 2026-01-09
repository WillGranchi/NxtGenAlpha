/**
 * Consensus indicator showing agreement level between strategies.
 */

import React, { useMemo } from 'react';

interface ConsensusIndicatorProps {
  individualSignals: Record<string, { dates: string[]; values: number[] }>;
  currentDate?: string;
}

export const ConsensusIndicator: React.FC<ConsensusIndicatorProps> = ({
  individualSignals,
  currentDate
}) => {
  const consensus = useMemo(() => {
    if (!currentDate || Object.keys(individualSignals).length === 0) {
      return { agreement: 0, signal: 0, buyCount: 0, sellCount: 0, holdCount: 0 };
    }
    
    const signals: number[] = [];
    Object.values(individualSignals).forEach(signalData => {
      const index = signalData.dates.indexOf(currentDate);
      if (index >= 0) {
        signals.push(signalData.values[index]);
      }
    });
    
    if (signals.length === 0) {
      return { agreement: 0, signal: 0, buyCount: 0, sellCount: 0, holdCount: 0 };
    }
    
    const buyCount = signals.filter(s => s === 1).length;
    const sellCount = signals.filter(s => s === -1).length;
    const holdCount = signals.filter(s => s === 0).length;
    
    const total = signals.length;
    const maxCount = Math.max(buyCount, sellCount, holdCount);
    const agreement = (maxCount / total) * 100;
    
    let signal = 0;
    if (buyCount > sellCount && buyCount > holdCount) {
      signal = 1;
    } else if (sellCount > buyCount && sellCount > holdCount) {
      signal = -1;
    }
    
    return { agreement, signal, buyCount, sellCount, holdCount, total };
  }, [individualSignals, currentDate]);

  const getColor = () => {
    if (consensus.signal === 1) return 'text-green-400';
    if (consensus.signal === -1) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getBgColor = () => {
    if (consensus.signal === 1) return 'bg-green-500/20 border-green-500/50';
    if (consensus.signal === -1) return 'bg-red-500/20 border-red-500/50';
    return 'bg-yellow-500/20 border-yellow-500/50';
  };

  const getSignalText = () => {
    if (consensus.signal === 1) return 'Strong Buy';
    if (consensus.signal === -1) return 'Strong Sell';
    return 'Mixed/Hold';
  };

  return (
    <div className={`bg-bg-secondary border border-border-default rounded-lg p-6 ${getBgColor()}`}>
      <h3 className="text-lg font-semibold text-text-primary mb-4">Consensus Indicator</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Agreement Level</span>
            <span className={`text-2xl font-bold ${getColor()}`}>
              {consensus.agreement.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                consensus.signal === 1 ? 'bg-green-500' :
                consensus.signal === -1 ? 'bg-red-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${consensus.agreement}%` }}
            />
          </div>
        </div>
        
        <div className="pt-4 border-t border-border-default">
          <div className={`text-center text-xl font-semibold ${getColor()} mb-2`}>
            {getSignalText()}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-green-400 font-semibold">{consensus.buyCount}</div>
              <div className="text-text-muted">Buy</div>
            </div>
            <div>
              <div className="text-yellow-400 font-semibold">{consensus.holdCount}</div>
              <div className="text-text-muted">Hold</div>
            </div>
            <div>
              <div className="text-red-400 font-semibold">{consensus.sellCount}</div>
              <div className="text-text-muted">Sell</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

