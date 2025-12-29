/**
 * Cycle Phase Indicator Component
 * Displays current cycle phase based on average z-score
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface CyclePhaseIndicatorProps {
  averageZScore: number | null;
}

type CyclePhase = 'accumulation' | 'markup' | 'distribution' | 'decline';

interface PhaseInfo {
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const getCyclePhase = (zScore: number): CyclePhase => {
  if (zScore < -1.5) return 'accumulation';
  if (zScore < 0) return 'markup';
  if (zScore < 1.5) return 'distribution';
  return 'decline';
};

const getPhaseInfo = (phase: CyclePhase): PhaseInfo => {
  switch (phase) {
    case 'accumulation':
      return {
        name: 'Accumulation',
        description: 'Oversold - Buying opportunity',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: <ArrowDown className="w-5 h-5" />,
      };
    case 'markup':
      return {
        name: 'Markup',
        description: 'Recovery phase',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        icon: <TrendingUp className="w-5 h-5" />,
      };
    case 'distribution':
      return {
        name: 'Distribution',
        description: 'Overbought - Selling opportunity',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: <TrendingUp className="w-5 h-5" />,
      };
    case 'decline':
      return {
        name: 'Decline',
        description: 'Extreme overbought - Correction phase',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: <ArrowDown className="w-5 h-5" />,
      };
  }
};

export const CyclePhaseIndicator: React.FC<CyclePhaseIndicatorProps> = ({
  averageZScore,
}) => {
  if (averageZScore === null || averageZScore === undefined) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Minus className="w-5 h-5 text-text-muted" />
          <div>
            <div className="text-sm font-medium text-text-secondary">Cycle Phase</div>
            <div className="text-xs text-text-muted">No data available</div>
          </div>
        </div>
      </div>
    );
  }

  const phase = getCyclePhase(averageZScore);
  const phaseInfo = getPhaseInfo(phase);

  return (
    <div className={`bg-bg-secondary border-2 ${phaseInfo.borderColor} rounded-lg p-4 ${phaseInfo.bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={phaseInfo.color}>
            {phaseInfo.icon}
          </div>
          <div>
            <div className="text-sm font-medium text-text-secondary mb-1">Cycle Phase</div>
            <div className={`text-lg font-bold ${phaseInfo.color}`}>
              {phaseInfo.name}
            </div>
            <div className="text-xs text-text-muted mt-1">
              {phaseInfo.description}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted mb-1">Avg Z-Score</div>
          <div className={`text-lg font-semibold ${phaseInfo.color}`}>
            {averageZScore.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

