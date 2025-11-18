import React, { useState } from 'react';

interface IndicatorParameter {
  type: 'int' | 'float';
  default: number;
  min: number;
  max: number;
  description: string;
}

interface IndicatorMetadata {
  name: string;
  description: string;
  parameters: Record<string, IndicatorParameter>;
  conditions: Record<string, string>;
}

interface IndicatorConfig {
  id: string;
  params: Record<string, any>;
  show_on_chart: boolean;
}

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  config: IndicatorConfig;
  onConfigChange: (config: IndicatorConfig) => void;
  onRemove: () => void;
  className?: string;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({
  indicator,
  config,
  onConfigChange,
  onRemove,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleParameterChange = (paramName: string, value: number) => {
    const newParams = { ...config.params, [paramName]: value };
    onConfigChange({ ...config, params: newParams });
  };

  const handleShowOnChartChange = (show: boolean) => {
    onConfigChange({ ...config, show_on_chart: show });
  };

  const getIndicatorIcon = (indicatorId: string) => {
    const icons: Record<string, string> = {
      'RSI': '📊',
      'MACD': '📈',
      'SMA': '📉',
      'EMA': '📊',
      'Bollinger': '📏',
      'EMA_Cross': '🔄'
    };
    return icons[indicatorId] || '📊';
  };

  const getIndicatorColor = (indicatorId: string) => {
    const colors: Record<string, string> = {
      'RSI': 'bg-orange-500/10 border-orange-500/30',
      'MACD': 'bg-primary-500/10 border-primary-500/30',
      'SMA': 'bg-success-500/10 border-success-500/30',
      'EMA': 'bg-purple-500/10 border-purple-500/30',
      'Bollinger': 'bg-warning-500/10 border-warning-500/30',
      'EMA_Cross': 'bg-purple-500/10 border-purple-500/30'
    };
    return colors[indicatorId] || 'bg-bg-secondary border-border-default';
  };

  return (
    <div className={`card border-2 transition-all duration-200 ${getIndicatorColor(config.id)} ${className}`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getIndicatorIcon(config.id)}</span>
            <div>
              <h3 className="font-semibold text-text-primary">{indicator.name}</h3>
              <p className="text-sm text-text-secondary">{indicator.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Show on Chart Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.show_on_chart}
                onChange={(e) => handleShowOnChartChange(e.target.checked)}
                className="w-4 h-4 text-primary-500 bg-bg-secondary border-border-default rounded focus:ring-primary-500"
              />
              <span className="text-sm text-text-secondary">Show on chart</span>
            </label>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Remove Button */}
            <button
              onClick={onRemove}
              className="p-1 text-danger-500 hover:text-danger-400 transition-colors"
              title="Remove indicator"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border-default">
          {/* Parameters */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-primary mb-3">Parameters</h4>
            <div className="space-y-3">
              {Object.entries(indicator.parameters).map(([paramName, paramConfig]) => (
                <div key={paramName}>
                  <label className="block text-sm text-text-secondary mb-1">
                    {paramName}
                    <span className="text-xs text-text-muted ml-1">({paramConfig.description})</span>
                  </label>
                  
                  {paramConfig.type === 'int' ? (
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min={paramConfig.min}
                        max={paramConfig.max}
                        value={config.params[paramName] || paramConfig.default}
                        onChange={(e) => handleParameterChange(paramName, parseInt(e.target.value) || paramConfig.default)}
                        className="w-20 input text-sm"
                      />
                      <input
                        type="range"
                        min={paramConfig.min}
                        max={paramConfig.max}
                        value={config.params[paramName] || paramConfig.default}
                        onChange={(e) => handleParameterChange(paramName, parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-text-muted w-8 text-right">
                        {paramConfig.min}-{paramConfig.max}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        step="0.1"
                        min={paramConfig.min}
                        max={paramConfig.max}
                        value={config.params[paramName] || paramConfig.default}
                        onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value) || paramConfig.default)}
                        className="w-20 input text-sm"
                      />
                      <input
                        type="range"
                        min={paramConfig.min}
                        max={paramConfig.max}
                        step="0.1"
                        value={config.params[paramName] || paramConfig.default}
                        onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-text-muted w-8 text-right">
                        {paramConfig.min}-{paramConfig.max}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Generated Conditions */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">Available Conditions</h4>
            <div className="flex flex-wrap gap-1">
              {Object.entries(indicator.conditions).map(([conditionName, conditionDesc]) => (
                <span
                  key={conditionName}
                  className="px-2 py-1 text-xs bg-bg-secondary border border-border-default rounded text-text-secondary"
                  title={conditionDesc}
                >
                  {conditionName}
                </span>
              ))}
            </div>
          </div>

          {/* Current Configuration Summary */}
          <div className="mt-4 p-3 bg-bg-secondary rounded border border-border-default">
            <h4 className="text-sm font-medium text-text-primary mb-2">Current Configuration</h4>
            <div className="text-xs text-text-secondary space-y-1">
              <div>ID: <code className="bg-bg-tertiary px-1 rounded text-text-primary">{config.id}</code></div>
              <div>Show on chart: <code className="bg-bg-tertiary px-1 rounded text-text-primary">{config.show_on_chart ? 'Yes' : 'No'}</code></div>
              <div>Parameters: <code className="bg-bg-tertiary px-1 rounded text-text-primary">{JSON.stringify(config.params)}</code></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
