/**
 * Indicator node component for flowchart canvas
 */

import React, { useState, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X, Settings } from 'lucide-react';
import type { FlowchartNode } from './FlowchartCanvas';
import type { IndicatorMetadata } from '../../services/api';

interface IndicatorNodeProps {
  node: FlowchartNode;
  metadata: IndicatorMetadata;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDrag: (deltaX: number, deltaY: number) => void;
  onConnectionPointClick?: (nodeId: string, point: 'input' | 'output', e: React.MouseEvent) => void;
  isConnecting?: boolean;
  isConnectingTo?: boolean;
  isConnectingFrom?: boolean;
}

export const IndicatorNode: React.FC<IndicatorNodeProps> = ({
  node,
  metadata,
  isSelected,
  onSelect,
  onRemove,
  onDrag,
  onConnectionPointClick,
  isConnecting = false,
  isConnectingTo = false,
  isConnectingFrom = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: node.id,
    disabled: true, // We'll handle dragging manually
  });

  const style = {
    left: `${node.x}px`,
    top: `${node.y}px`,
    transform: CSS.Translate.toString(transform),
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - node.x, y: e.clientY - node.y });
      onSelect();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x - node.x;
      const deltaY = e.clientY - dragStart.y - node.y;
      onDrag(deltaX, deltaY);
      setDragStart({ x: e.clientX - node.x, y: e.clientY - node.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      className={`indicator-node absolute w-48 cursor-move select-none ${
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-secondary'
          : ''
      }`}
      style={style}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
            absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-bg-secondary cursor-pointer transition-all
            ${isConnectingFrom ? 'bg-primary-400 scale-125 ring-2 ring-primary-500' : 'bg-primary-500 hover:bg-primary-400 hover:scale-110'}
          `}
          onClick={(e) => onConnectionPointClick?.(node.id, 'output', e)}
          title="Output connection point"
        />
        <div
          className={`
            absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-bg-secondary cursor-pointer transition-all
            ${isConnectingTo ? 'bg-purple-400 scale-125 ring-2 ring-purple-500' : 'bg-purple-500 hover:bg-purple-400 hover:scale-110'}
            ${isConnecting && !isConnectingTo ? 'opacity-50' : ''}
          `}
          onClick={(e) => onConnectionPointClick?.(node.id, 'input', e)}
          title="Input connection point"
        />
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(IndicatorNode);

