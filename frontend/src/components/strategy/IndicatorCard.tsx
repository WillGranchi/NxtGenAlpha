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
      'RSI': 'bg-orange-100 border-orange-300',
      'MACD': 'bg-blue-100 border-blue-300',
      'SMA': 'bg-green-100 border-green-300',
      'EMA': 'bg-purple-100 border-purple-300',
      'Bollinger': 'bg-yellow-100 border-yellow-300',
      'EMA_Cross': 'bg-pink-100 border-pink-300'
    };
    return colors[indicatorId] || 'bg-gray-100 border-gray-300';
  };

  return (
    <div className={`border rounded-lg shadow-sm transition-all duration-200 ${getIndicatorColor(config.id)} ${className}`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getIndicatorIcon(config.id)}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{indicator.name}</h3>
              <p className="text-sm text-gray-600">{indicator.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Show on Chart Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.show_on_chart}
                onChange={(e) => handleShowOnChartChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show on chart</span>
            </label>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
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
              className="p-1 text-red-500 hover:text-red-700 transition-colors"
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
        <div className="px-4 pb-4 border-t border-gray-200">
          {/* Parameters */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Parameters</h4>
            <div className="space-y-3">
              {Object.entries(indicator.parameters).map(([paramName, paramConfig]) => (
                <div key={paramName}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {paramName}
                    <span className="text-xs text-gray-500 ml-1">({paramConfig.description})</span>
                  </label>
                  
                  {paramConfig.type === 'int' ? (
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min={paramConfig.min}
                        max={paramConfig.max}
                        value={config.params[paramName] || paramConfig.default}
                        onChange={(e) => handleParameterChange(paramName, parseInt(e.target.value) || paramConfig.default)}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="range"
                        min={paramConfig.min}
                        max={paramConfig.max}
                        value={config.params[paramName] || paramConfig.default}
                        onChange={(e) => handleParameterChange(paramName, parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500 w-8 text-right">
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
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <span className="text-xs text-gray-500 w-8 text-right">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Conditions</h4>
            <div className="flex flex-wrap gap-1">
              {Object.entries(indicator.conditions).map(([conditionName, conditionDesc]) => (
                <span
                  key={conditionName}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded text-gray-700"
                  title={conditionDesc}
                >
                  {conditionName}
                </span>
              ))}
            </div>
          </div>

          {/* Current Configuration Summary */}
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>ID: <code className="bg-gray-100 px-1 rounded">{config.id}</code></div>
              <div>Show on chart: <code className="bg-gray-100 px-1 rounded">{config.show_on_chart ? 'Yes' : 'No'}</code></div>
              <div>Parameters: <code className="bg-gray-100 px-1 rounded">{JSON.stringify(config.params)}</code></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
