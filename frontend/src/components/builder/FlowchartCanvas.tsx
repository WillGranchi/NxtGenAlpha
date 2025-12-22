/**
 * Flowchart-style canvas for drag-and-drop strategy building
 */

import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { DragOverlay, useDroppable } from '@dnd-kit/core';
import { type IndicatorConfig, type IndicatorMetadata } from '../../services/api';
import { IndicatorNode } from './IndicatorNode';
import { ConnectionLine } from './ConnectionLine';
import { ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react';
import { Button } from '../ui/Button';

export interface FlowchartNode {
  id: string;
  indicatorId: string;
  x: number;
  y: number;
  config: IndicatorConfig;
}

export interface FlowchartConnection {
  id: string;
  from: string; // node id
  to: string; // node id
  type: 'AND' | 'OR';
}

interface FlowchartCanvasProps {
  nodes: FlowchartNode[];
  connections: FlowchartConnection[];
  availableIndicators: Record<string, IndicatorMetadata> | null;
  onNodeAdd: (indicatorId: string, x: number, y: number) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeRemove: (nodeId: string) => void;
  onConnectionAdd: (from: string, to: string, type: 'AND' | 'OR') => void;
  onConnectionRemove: (connectionId: string) => void;
  onConnectionPointClick?: (nodeId: string, point: 'input' | 'output', e: React.MouseEvent) => void;
  selectedNodeId: string | null;
  connectingFrom?: { nodeId: string; point: 'output' } | null;
  mousePosition?: { x: number; y: number } | null;
  onDropPosition?: (x: number, y: number) => { adjustedX: number; adjustedY: number };
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

// Canvas drop zone component
const CanvasDropZone: React.FC<{
  children: React.ReactNode;
  pan: { x: number; y: number };
  zoom: number;
  onDropPosition?: (x: number, y: number) => { adjustedX: number; adjustedY: number };
}> = ({ children, pan, zoom, onDropPosition }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      data-droppable="canvas"
      className={`w-full h-full ${isOver ? 'bg-primary-500/10' : ''}`}
    >
      {children}
    </div>
  );
};

export const FlowchartCanvas: React.FC<FlowchartCanvasProps> = ({
  nodes,
  connections,
  availableIndicators,
  onNodeAdd,
  onNodeMove,
  onNodeSelect,
  onNodeRemove,
  onConnectionRemove,
  onConnectionPointClick,
  selectedNodeId,
  connectingFrom,
  mousePosition,
  onDropPosition,
  zoom: externalZoom,
  onZoomChange,
}) => {
  const [internalZoom, setInternalZoom] = useState(1);
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle canvas panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('.indicator-node')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    const currentZoom = externalZoom !== undefined ? externalZoom : internalZoom;
    const newZoom = Math.min(currentZoom + 0.1, 2);
    if (onZoomChange) {
      onZoomChange(newZoom);
    } else {
      setInternalZoom(newZoom);
    }
  }, [externalZoom, internalZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const currentZoom = externalZoom !== undefined ? externalZoom : internalZoom;
    const newZoom = Math.max(currentZoom - 0.1, 0.5);
    if (onZoomChange) {
      onZoomChange(newZoom);
    } else {
      setInternalZoom(newZoom);
    }
  }, [externalZoom, internalZoom, onZoomChange]);

  const handleResetView = useCallback(() => {
    if (onZoomChange) {
      onZoomChange(1);
    } else {
      setInternalZoom(1);
    }
    setPan({ x: 0, y: 0 });
  }, [onZoomChange]);


  // Calculate connection counts for each node
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    connections.forEach(conn => {
      counts[conn.from] = (counts[conn.from] || 0) + 1;
      counts[conn.to] = (counts[conn.to] || 0) + 1;
    });
    return counts;
  }, [connections]);

  return (
    <div className="relative w-full h-full bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        {/* Canvas Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="px-2 py-1 text-sm text-text-secondary bg-bg-tertiary rounded">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetView}
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>

        {/* Canvas */}
        <CanvasDropZone
          pan={pan}
          zoom={zoom}
          onDropPosition={onDropPosition}
        >
          <div
            ref={canvasRef}
            className="w-full h-full relative cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
          {/* Grid Background */}
          {showGrid && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, ${getComputedStyle(document.documentElement).getPropertyValue('--color-border') || '#2A2A2A'} 1px, transparent 1px),
                  linear-gradient(to bottom, ${getComputedStyle(document.documentElement).getPropertyValue('--color-border') || '#2A2A2A'} 1px, transparent 1px)
                `,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            />
          )}

          {/* Nodes Container */}
          <div
            data-nodes-container
            data-zoom={zoom}
            data-pan-x={pan.x}
            data-pan-y={pan.y}
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
              {/* Connection Lines */}
              <svg className="absolute inset-0" style={{ zIndex: 1, pointerEvents: 'none' }}>
                {connections.map(connection => {
                  const fromNode = nodes.find(n => n.id === connection.from);
                  const toNode = nodes.find(n => n.id === connection.to);
                  if (!fromNode || !toNode) return null;

                  return (
                    <ConnectionLine
                      key={connection.id}
                      from={{ x: fromNode.x + 100, y: fromNode.y + 50 }}
                      to={{ x: toNode.x + 100, y: toNode.y + 50 }}
                      type={connection.type}
                      onClick={() => onConnectionRemove(connection.id)}
                    />
                  );
                })}
                {/* Preview connection line when connecting */}
                {connectingFrom && mousePosition && (() => {
                  const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
                  if (!fromNode) return null;
                  return (
                    <ConnectionLine
                      from={{ x: fromNode.x + 100, y: fromNode.y + 50 }}
                      to={mousePosition}
                      type="AND"
                      isPreview={true}
                    />
                  );
                })()}
              </svg>

              {/* Indicator Nodes */}
              {nodes.map(node => {
                const metadata = availableIndicators?.[node.indicatorId];
                if (!metadata) return null;

                const isConnectingTo = connectingFrom ? connectingFrom.nodeId !== node.id : false;
                const isConnectingFromNode = connectingFrom?.nodeId === node.id;
                const connectionCount = connectionCounts[node.id] || 0;

                return (
                  <IndicatorNode
                    key={node.id}
                    node={node}
                    metadata={metadata}
                    isSelected={selectedNodeId === node.id}
                    onSelect={() => onNodeSelect(node.id)}
                    onRemove={() => onNodeRemove(node.id)}
                    onConnectionPointClick={onConnectionPointClick}
                    isConnecting={!!connectingFrom}
                    isConnectingTo={isConnectingTo}
                    isConnectingFrom={isConnectingFromNode}
                    connectionCount={connectionCount}
                  />
                );
              })}
          </div>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-text-muted mb-2">Drag indicators from the library to build your strategy</p>
                <p className="text-sm text-text-muted">Create a visual flow of your trading logic</p>
              </div>
            </div>
          )}
          </div>
          </CanvasDropZone>
      </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(FlowchartCanvas);

