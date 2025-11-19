/**
 * Indicator node component for flowchart canvas
 */

import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import type { FlowchartNode } from './FlowchartCanvas';
import type { IndicatorMetadata } from '../../services/api';

interface IndicatorNodeProps {
  node: FlowchartNode;
  metadata: IndicatorMetadata;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onConnectionPointClick?: (nodeId: string, point: 'input' | 'output', e: React.MouseEvent) => void;
  isConnecting?: boolean;
  isConnectingTo?: boolean;
  isConnectingFrom?: boolean;
  connectionCount?: number;
}

export const IndicatorNode: React.FC<IndicatorNodeProps> = ({
  node,
  metadata,
  isSelected,
  onSelect,
  onRemove,
  onConnectionPointClick,
  isConnecting = false,
  isConnectingTo = false,
  isConnectingFrom = false,
  connectionCount = 0,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: node.id,
    disabled: false, // Enable @dnd-kit dragging
  });

  const style = {
    left: `${node.x}px`,
    top: `${node.y}px`,
    transform: CSS.Translate.toString(transform),
    willChange: isDndDragging ? 'transform' : 'auto',
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only select if not dragging and not clicking on buttons
    if (!isDndDragging && !(e.target as HTMLElement).closest('button')) {
      onSelect();
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Momentum':
        return 'border-purple-500 bg-purple-500/10';
      case 'Trend':
        return 'border-primary-500 bg-primary-500/10';
      case 'Volatility':
        return 'border-accent-cyan bg-accent-cyan/10';
      default:
        return 'border-border-light bg-bg-tertiary';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`indicator-node absolute w-48 cursor-move select-none transition-shadow ${
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-secondary'
          : ''
      } ${isDndDragging ? 'opacity-90 z-50' : 'z-10'}`}
      style={style}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div
        className={`
          card p-3 border-2 transition-all duration-200
          ${getCategoryColor(metadata.category)}
          ${isSelected ? 'shadow-lg shadow-primary-500/50' : 'hover:shadow-md'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-text-primary text-sm truncate">
              {metadata.name}
            </h4>
            <p className="text-xs text-text-muted truncate mt-0.5">
              {metadata.description}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-2 p-1 text-text-muted hover:text-danger-500 transition-colors"
            title="Remove indicator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Parameters Summary */}
        <div className="mt-2 pt-2 border-t border-border-default">
          <div className="flex flex-wrap gap-1">
            {Object.entries(node.config.params).slice(0, 3).map(([key, value]) => (
              <span
                key={key}
                className="text-xs px-1.5 py-0.5 bg-bg-secondary rounded text-text-secondary"
              >
                {key}: {value}
              </span>
            ))}
            {Object.keys(node.config.params).length > 3 && (
              <span className="text-xs text-text-muted">
                +{Object.keys(node.config.params).length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Connection Points */}
        <div
          className={`
            absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-bg-secondary cursor-pointer transition-all z-20
            ${isConnectingFrom ? 'bg-primary-400 scale-125 ring-2 ring-primary-500 animate-pulse' : 'bg-primary-500 hover:bg-primary-400 hover:scale-110'}
            ${connectionCount > 0 ? 'ring-2 ring-primary-400/50' : ''}
          `}
          onClick={(e) => {
            e.stopPropagation();
            onConnectionPointClick?.(node.id, 'output', e);
          }}
          title="Output connection point"
        />
        {connectionCount > 0 && (
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 translate-x-4 w-2 h-2 rounded-full bg-primary-400 z-20" />
        )}
        <div
          className={`
            absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-bg-secondary cursor-pointer transition-all z-20
            ${isConnectingTo ? 'bg-purple-400 scale-125 ring-2 ring-purple-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-400 hover:scale-110'}
            ${isConnecting && !isConnectingTo ? 'opacity-50' : ''}
            ${connectionCount > 0 ? 'ring-2 ring-purple-400/50' : ''}
          `}
          onClick={(e) => {
            e.stopPropagation();
            onConnectionPointClick?.(node.id, 'input', e);
          }}
          title="Input connection point"
        />
        {connectionCount > 0 && (
          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 -translate-x-4 w-2 h-2 rounded-full bg-purple-400 z-20" />
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(IndicatorNode);

