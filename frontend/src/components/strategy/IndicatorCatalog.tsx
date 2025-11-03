import React, { useState, useMemo } from 'react';
import type { IndicatorMetadata } from '../../services/api';

interface IndicatorCatalogProps {
  availableIndicators: Record<string, IndicatorMetadata> | null;
  onAddIndicator: (indicatorId: string) => void;
  selectedIndicatorIds: string[];
  isLoading?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Momentum: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  Trend: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  Volatility: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  Other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

const IndicatorCatalog: React.FC<IndicatorCatalogProps> = ({
  availableIndicators,
  onAddIndicator,
  selectedIndicatorIds,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Indicators</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading indicators...</span>
        </div>
      </div>
    );
  }

  if (!availableIndicators) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Indicators</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No indicators available</p>
        </div>
      </div>
    );
  }

  // Get all unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    Object.values(availableIndicators).forEach(ind => {
      if (ind.category) {
        cats.add(ind.category);
      }
    });
    return ['All', ...Array.from(cats).sort()];
  }, [availableIndicators]);

  // Filter indicators by category and search
  const filteredIndicators = useMemo(() => {
    let indicators = Object.entries(availableIndicators);

    // Filter by category
    if (selectedCategory !== 'All') {
      indicators = indicators.filter(([_, metadata]) => metadata.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      indicators = indicators.filter(([id, metadata]) => 
        id.toLowerCase().includes(query) ||
        metadata.name.toLowerCase().includes(query) ||
        metadata.description.toLowerCase().includes(query)
      );
    }

    return indicators;
  }, [availableIndicators, selectedCategory, searchQuery]);

  const getCategoryStyle = (category: string | undefined) => {
    if (!category || !CATEGORY_COLORS[category]) {
      return CATEGORY_COLORS['Other'];
    }
    return CATEGORY_COLORS[category];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Indicators</h3>
      <p className="text-sm text-gray-600 mb-6">
        Click "Add to Strategy" to include an indicator in your strategy configuration.
      </p>

      {/* Search and Category Filter */}
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search indicators by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicators.map(([indicatorId, metadata]) => {
          const isSelected = selectedIndicatorIds.includes(indicatorId);
          const categoryStyle = getCategoryStyle(metadata.category);
          
          return (
            <div
              key={indicatorId}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{metadata.name}</h4>
                    {metadata.category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
                        {metadata.category}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {indicatorId}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {metadata.description}
              </p>
              
              <div className="mb-4">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Parameters:</h5>
                <div className="space-y-1">
                  {Object.entries(metadata.parameters).map(([paramName, param]) => (
                    <div key={paramName} className="flex justify-between text-xs">
                      <span className="text-gray-600">{paramName}:</span>
                      <span className="text-gray-900 font-mono">{param.default}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Conditions:</h5>
                <div className="space-y-1">
                  {Object.entries(metadata.conditions).slice(0, 3).map(([conditionName, description]) => (
                    <div key={conditionName} className="text-xs text-gray-600">
                      <span className="font-mono text-blue-600">{conditionName}</span>
                      <span className="ml-1">- {description}</span>
                    </div>
                  ))}
                  {Object.keys(metadata.conditions).length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{Object.keys(metadata.conditions).length - 3} more...
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => onAddIndicator(indicatorId)}
                disabled={isSelected}
                className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {isSelected ? 'Added to Strategy' : 'Add to Strategy'}
              </button>
            </div>
          );
        })}
      </div>
      
      {filteredIndicators.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchQuery || selectedCategory !== 'All'
              ? 'No indicators match your filters'
              : 'No indicators available'}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default IndicatorCatalog;
