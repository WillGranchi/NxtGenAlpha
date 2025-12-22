/**
 * Draggable indicator library panel
 */

import React, { useState, useMemo, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, Filter } from 'lucide-react';
import type { IndicatorMetadata } from '../../services/api';
import { Input } from '../ui/Input';

interface DraggableIndicatorProps {
  indicatorId: string;
  metadata: IndicatorMetadata;
  onAddClick?: () => void;
}

const DraggableIndicator: React.FC<DraggableIndicatorProps> = ({ indicatorId, metadata, onAddClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: indicatorId,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Momentum':
        return 'border-purple-500/50 bg-purple-500/5';
      case 'Trend':
        return 'border-primary-500/50 bg-primary-500/5';
      case 'Volatility':
        return 'border-accent-cyan/50 bg-accent-cyan/5';
      default:
        return 'border-border-default bg-bg-tertiary';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        card p-3 cursor-pointer
        border transition-all duration-200
        ${getCategoryColor(metadata.category)}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:border-primary-500/50 hover:shadow-md'}
      `}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging && onAddClick) {
          onAddClick();
        }
      }}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-text-primary text-sm mb-1">
            {metadata.name}
          </h4>
          <p className="text-xs text-text-muted line-clamp-2 mb-2">
            {metadata.description}
          </p>
          {metadata.category && (
            <span className="inline-block text-xs px-2 py-0.5 bg-bg-secondary rounded text-text-secondary">
              {metadata.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface IndicatorLibraryProps {
  availableIndicators: Record<string, IndicatorMetadata> | null;
  selectedIndicatorIds: string[];
  isLoading?: boolean;
  onAddIndicator?: (indicatorId: string) => void;
}

export const IndicatorLibrary: React.FC<IndicatorLibraryProps> = ({
  availableIndicators,
  selectedIndicatorIds,
  isLoading = false,
  onAddIndicator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    if (!availableIndicators) return [];
    const cats = new Set<string>();
    Object.values(availableIndicators).forEach(ind => {
      if (ind.category) {
        cats.add(ind.category);
      }
    });
    return ['All', ...Array.from(cats).sort()];
  }, [availableIndicators]);

  const filteredIndicators = useMemo(() => {
    if (!availableIndicators) return [];

    let indicators = Object.entries(availableIndicators);

    // Filter by category
    if (selectedCategory !== 'All') {
      indicators = indicators.filter(([_, metadata]) => metadata.category === selectedCategory);
    }

    // Filter by search
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

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="spinner w-8 h-8 border-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!availableIndicators) {
    return (
      <div className="card p-6">
        <p className="text-text-muted text-center">No indicators available</p>
      </div>
    );
  }

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Indicator Library
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Click or drag indicators to add them to the canvas
        </p>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search indicators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  selectedCategory === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Indicators List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredIndicators.map(([indicatorId, metadata]) => {
          const isSelected = selectedIndicatorIds.includes(indicatorId);
          
          return (
            <div
              key={indicatorId}
              className={isSelected ? 'opacity-50 pointer-events-none' : ''}
            >
              <DraggableIndicator
                indicatorId={indicatorId}
                metadata={metadata}
                onAddClick={onAddIndicator ? () => onAddIndicator(indicatorId) : undefined}
              />
            </div>
          );
        })}

        {filteredIndicators.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted">No indicators match your filters</p>
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-2 text-sm text-primary-500 hover:text-primary-400"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(IndicatorLibrary);

