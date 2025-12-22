/**
 * Tooltip component for condition explanations with buy/sell examples
 */

import React from 'react';
import { Info } from 'lucide-react';

interface ConditionTooltipProps {
  conditionName: string;
  description: string;
  children: React.ReactNode;
}

// Condition explanations with buy/sell examples
const CONDITION_EXAMPLES: Record<string, { insight: string; buyExample: string; sellExample: string }> = {
  // RSI conditions
  'rsi_oversold': {
    insight: 'RSI below 30 indicates oversold conditions - price may be due for a bounce upward.',
    buyExample: 'Buy when RSI is oversold (below 30) - suggests potential upward reversal.',
    sellExample: 'Avoid buying or consider selling when RSI is oversold in a downtrend.'
  },
  'rsi_overbought': {
    insight: 'RSI above 70 indicates overbought conditions - price may be due for a pullback.',
    buyExample: 'Avoid buying when RSI is overbought (above 70) - suggests potential reversal.',
    sellExample: 'Sell when RSI is overbought (above 70) - suggests potential downward reversal.'
  },
  'rsi_cross_above_oversold': {
    insight: 'RSI crossing above 30 suggests momentum shift from oversold to neutral/bullish.',
    buyExample: 'Buy when RSI crosses above oversold - indicates momentum shift upward.',
    sellExample: 'Hold or wait - this is typically a bullish signal.'
  },
  'rsi_cross_below_overbought': {
    insight: 'RSI crossing below 70 suggests momentum shift from overbought to neutral/bearish.',
    buyExample: 'Wait or avoid buying - momentum may be weakening.',
    sellExample: 'Sell when RSI crosses below overbought - indicates momentum shift downward.'
  },
  
  // MACD conditions
  'macd_cross_up': {
    insight: 'MACD line crossing above signal line indicates bullish momentum.',
    buyExample: 'Buy when MACD crosses up - strong bullish momentum signal.',
    sellExample: 'Hold or avoid selling - this is a bullish signal.'
  },
  'macd_cross_down': {
    insight: 'MACD line crossing below signal line indicates bearish momentum.',
    buyExample: 'Avoid buying - bearish momentum signal.',
    sellExample: 'Sell when MACD crosses down - strong bearish momentum signal.'
  },
  'macd_above_signal': {
    insight: 'MACD above signal line indicates ongoing bullish momentum.',
    buyExample: 'Buy when MACD is above signal - bullish trend in place.',
    sellExample: 'Hold - bullish momentum is active.'
  },
  'macd_below_signal': {
    insight: 'MACD below signal line indicates ongoing bearish momentum.',
    buyExample: 'Avoid buying - bearish trend in place.',
    sellExample: 'Sell when MACD is below signal - bearish momentum is active.'
  },
  'macd_above_zero': {
    insight: 'MACD above zero indicates overall bullish market conditions.',
    buyExample: 'Buy when MACD is above zero - bullish market conditions.',
    sellExample: 'Hold - market is in bullish territory.'
  },
  'macd_below_zero': {
    insight: 'MACD below zero indicates overall bearish market conditions.',
    buyExample: 'Avoid buying - bearish market conditions.',
    sellExample: 'Sell when MACD is below zero - bearish market conditions.'
  },
  
  // SMA conditions
  'sma_price_above': {
    insight: 'Price above SMA indicates uptrend - price is above average.',
    buyExample: 'Buy when price is above SMA - uptrend confirmed.',
    sellExample: 'Hold - price is in uptrend territory.'
  },
  'sma_price_below': {
    insight: 'Price below SMA indicates downtrend - price is below average.',
    buyExample: 'Avoid buying - downtrend confirmed.',
    sellExample: 'Sell when price is below SMA - downtrend in place.'
  },
  'sma_price_cross_above': {
    insight: 'Price crossing above SMA indicates trend reversal to bullish.',
    buyExample: 'Buy when price crosses above SMA - bullish reversal signal.',
    sellExample: 'Hold - this is typically a bullish signal.'
  },
  'sma_price_cross_below': {
    insight: 'Price crossing below SMA indicates trend reversal to bearish.',
    buyExample: 'Avoid buying - bearish reversal signal.',
    sellExample: 'Sell when price crosses below SMA - bearish reversal signal.'
  },
  
  // EMA conditions
  'ema_price_above': {
    insight: 'Price above EMA indicates uptrend with emphasis on recent prices.',
    buyExample: 'Buy when price is above EMA - uptrend with recent momentum.',
    sellExample: 'Hold - price is in uptrend territory.'
  },
  'ema_price_below': {
    insight: 'Price below EMA indicates downtrend with emphasis on recent prices.',
    buyExample: 'Avoid buying - downtrend with recent weakness.',
    sellExample: 'Sell when price is below EMA - downtrend in place.'
  },
  'ema_price_cross_above': {
    insight: 'Price crossing above EMA indicates bullish momentum shift.',
    buyExample: 'Buy when price crosses above EMA - bullish momentum shift.',
    sellExample: 'Hold - this is typically a bullish signal.'
  },
  'ema_price_cross_below': {
    insight: 'Price crossing below EMA indicates bearish momentum shift.',
    buyExample: 'Avoid buying - bearish momentum shift.',
    sellExample: 'Sell when price crosses below EMA - bearish momentum shift.'
  },
  
  // Bollinger Bands conditions
  'bb_price_above_upper': {
    insight: 'Price above upper band suggests overbought conditions - potential reversal.',
    buyExample: 'Avoid buying - price is overextended upward.',
    sellExample: 'Sell when price is above upper band - overbought, potential reversal.'
  },
  'bb_price_below_lower': {
    insight: 'Price below lower band suggests oversold conditions - potential bounce.',
    buyExample: 'Buy when price is below lower band - oversold, potential bounce.',
    sellExample: 'Avoid selling - price may bounce upward.'
  },
  'bb_price_touch_upper': {
    insight: 'Price touching upper band suggests strong upward momentum.',
    buyExample: 'Consider buying on pullback - strong upward momentum.',
    sellExample: 'Sell when price touches upper band - potential reversal point.'
  },
  'bb_price_touch_lower': {
    insight: 'Price touching lower band suggests strong downward momentum.',
    buyExample: 'Buy when price touches lower band - potential bounce point.',
    sellExample: 'Avoid selling - price may bounce upward.'
  },
  'bb_price_squeeze': {
    insight: 'Bollinger Bands squeeze indicates low volatility - potential breakout coming.',
    buyExample: 'Watch for breakout - low volatility suggests big move coming.',
    sellExample: 'Watch for breakout direction - prepare for volatility increase.'
  },
  
  // EMA Cross conditions
  'ema_fast_gt_slow': {
    insight: 'Fast EMA above slow EMA indicates bullish trend.',
    buyExample: 'Buy when fast EMA is above slow EMA - bullish trend.',
    sellExample: 'Hold - bullish trend is active.'
  },
  'ema_slow_gt_fast': {
    insight: 'Slow EMA above fast EMA indicates bearish trend.',
    buyExample: 'Avoid buying - bearish trend in place.',
    sellExample: 'Sell when slow EMA is above fast EMA - bearish trend.'
  },
  'ema_cross_up': {
    insight: 'Fast EMA crossing above slow EMA indicates bullish trend reversal.',
    buyExample: 'Buy when fast EMA crosses above slow EMA - bullish reversal.',
    sellExample: 'Hold - this is typically a bullish signal.'
  },
  'ema_cross_down': {
    insight: 'Fast EMA crossing below slow EMA indicates bearish trend reversal.',
    buyExample: 'Avoid buying - bearish reversal signal.',
    sellExample: 'Sell when fast EMA crosses below slow EMA - bearish reversal.'
  }
};

export const ConditionTooltip: React.FC<ConditionTooltipProps> = ({
  conditionName,
  description,
  children
}) => {
  const conditionKey = conditionName.toLowerCase();
  const example = CONDITION_EXAMPLES[conditionKey];
  
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 p-4 bg-bg-elevated border border-border-default rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-semibold text-text-primary">{conditionName}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
          </div>
          
          {example && (
            <>
              <div className="border-t border-border-default pt-2">
                <p className="text-xs font-medium text-text-primary mb-2">💡 Insight</p>
                <p className="text-xs text-text-secondary leading-relaxed">{example.insight}</p>
              </div>
              
              <div className="border-t border-border-default pt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium text-success-500 mb-1">🟢 Buy Example</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{example.buyExample}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-danger-500 mb-1">🔴 Sell Example</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{example.sellExample}</p>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-bg-elevated" />
      </div>
    </div>
  );
};

