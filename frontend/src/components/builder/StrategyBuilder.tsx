/**
 * Main strategy builder component integrating flowchart canvas, library, and side panel
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, useSensor, useSensors, PointerSensor, MouseSensor, TouchSensor, useDndMonitor } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { FlowchartCanvas, type FlowchartNode, type FlowchartConnection } from './FlowchartCanvas';
import { IndicatorLibrary } from './IndicatorLibrary';
import { SidePanel } from './SidePanel';
import { StrategyDescription } from '../strategy/StrategyDescription';
import type { IndicatorConfig, IndicatorMetadata } from '../../services/api';

interface StrategyBuilderProps {
  availableIndicators: Record<string, IndicatorMetadata> | null;
  selectedIndicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  onUpdateIndicatorParams: (indicatorId: string, params: Record<string, any>) => void;
  onUpdateIndicatorShowOnChart: (indicatorId: string, showOnChart: boolean) => void;
  onUpdateExpression?: (expression: string) => void;
  onUpdateLongExpression?: (expression: string) => void;
  onUpdateCashExpression?: (expression: string) => void;
  onUpdateShortExpression?: (expression: string) => void;
  useSeparateExpressions?: boolean;
  strategyType?: 'long_cash' | 'long_short';
  availableConditions?: Record<string, string>;
  initialCapital?: number;
  onUpdateInitialCapital?: (capital: number) => void;
  onRunBacktest?: () => void;
  isLoading?: boolean;
  isBacktestLoading?: boolean;
  backtestResults?: any; // ModularBacktestResponse
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  availableIndicators,
  selectedIndicators,
  onIndicatorsChange,
  onUpdateIndicatorParams,
  onUpdateIndicatorShowOnChart,
  onUpdateExpression,
  onUpdateLongExpression,
  onUpdateCashExpression,
  onUpdateShortExpression,
  useSeparateExpressions = false,
  strategyType = 'long_cash',
  availableConditions = {},
  initialCapital = 10000,
  onUpdateInitialCapital,
  onRunBacktest,
  isLoading = false,
  isBacktestLoading = false,
  backtestResults,
}) => {
  const [nodes, setNodes] = useState<FlowchartNode[]>([]);
  const [connections, setConnections] = useState<FlowchartConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; point: 'output' } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Smart auto-layout: Calculate next position for new nodes
  const calculateNextPosition = useCallback((existingNodes: FlowchartNode[]): { x: number; y: number } => {
    if (existingNodes.length === 0) {
      // First node: center of canvas
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
          x: (rect.width / 2) - 100, // 100 = half of node width (200px)
          y: (rect.height / 2) - 50, // 50 = half of node height (100px)
        };
      }
      return { x: 400, y: 300 }; // Fallback center
    }

    // Find the rightmost node
    const rightmostNode = existingNodes.reduce((rightmost, node) => 
      node.x > rightmost.x ? node : rightmost
    );

    const nodeWidth = 200;
    const nodeHeight = 100;
    const horizontalSpacing = 250;
    const verticalSpacing = 150;
    const margin = 50;

    // Calculate next position
    let nextX = rightmostNode.x + horizontalSpacing;
    let nextY = rightmostNode.y;

    // Check if we need to wrap to next row
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (nextX + nodeWidth > rect.width - margin) {
        // Wrap to next row
        const leftmostX = Math.min(...existingNodes.map(n => n.x));
        nextX = leftmostX;
        nextY = rightmostNode.y + verticalSpacing;
      }
    } else {
      // Fallback: wrap at 1200px
      if (nextX + nodeWidth > 1200 - margin) {
        const leftmostX = Math.min(...existingNodes.map(n => n.x));
        nextX = leftmostX;
        nextY = rightmostNode.y + verticalSpacing;
      }
    }

    return { x: nextX, y: nextY };
  }, []);

  // Sync nodes with selectedIndicators
  React.useEffect(() => {
    if (!availableIndicators) return;

    setNodes(prevNodes => {
      // Create a map of existing nodes by indicatorId
      const existingNodesMap = new Map(prevNodes.map(n => [n.indicatorId, n]));

      // Create/update nodes from selectedIndicators
      const updatedNodes: FlowchartNode[] = [];
      const newIndicators: IndicatorConfig[] = [];

      selectedIndicators.forEach((indicator) => {
        const existingNode = existingNodesMap.get(indicator.id);
        
        if (existingNode) {
          // Update existing node config
          updatedNodes.push({ ...existingNode, config: indicator });
        } else {
          // New indicator - will be positioned by calculateNextPosition
          newIndicators.push(indicator);
        }
      });

      // Position new indicators using smart layout
      newIndicators.forEach((indicator) => {
        const position = calculateNextPosition(updatedNodes);
        updatedNodes.push({
          id: `node-${indicator.id}`,
          indicatorId: indicator.id,
          x: position.x,
          y: position.y,
          config: indicator,
        });
      });

      return updatedNodes;
    });
  }, [selectedIndicators, availableIndicators, calculateNextPosition]);

  // Sync selectedIndicators with nodes
  const syncIndicatorsFromNodes = useCallback(() => {
    const indicators: IndicatorConfig[] = nodes.map(node => node.config);
    onIndicatorsChange(indicators);
  }, [nodes, onIndicatorsChange]);

  // Handle adding a node from library (click or drag)
  const handleNodeAdd = useCallback((indicatorId: string, x?: number, y?: number) => {
    if (!availableIndicators?.[indicatorId]) return;

    // Check if indicator is already added
    if (selectedIndicators.some(ind => ind.id === indicatorId)) {
      return;
    }

    const metadata = availableIndicators[indicatorId];
    const defaultParams: Record<string, any> = {};
    Object.entries(metadata.parameters).forEach(([key, param]) => {
      defaultParams[key] = param.default;
    });

    const newConfig: IndicatorConfig = {
      id: indicatorId,
      params: defaultParams,
      show_on_chart: true,
    };

    // Add to selectedIndicators via callback
    // Position will be calculated by auto-layout in useEffect
    onIndicatorsChange([...selectedIndicators, newConfig]);
  }, [availableIndicators, selectedIndicators, onIndicatorsChange]);

  // Handle moving a node
  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, x, y } : node
    ));
  }, []);

  // Handle selecting a node
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Handle removing a node
  const handleNodeRemove = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNodeId(null);

    // Update selectedIndicators - remove the indicator
    onIndicatorsChange(selectedIndicators.filter(ind => ind.id !== node.indicatorId));
  }, [nodes, selectedIndicators, onIndicatorsChange]);

  // Handle updating node config (from side panel)
  const handleConfigUpdate = useCallback((config: IndicatorConfig) => {
    setNodes(prev => prev.map(node =>
      node.indicatorId === config.id
        ? { ...node, config }
        : node
    ));

    // Update the indicator in selectedIndicators
    onUpdateIndicatorParams(config.id, config.params);
    onUpdateIndicatorShowOnChart(config.id, config.show_on_chart);
  }, [onUpdateIndicatorParams, onUpdateIndicatorShowOnChart]);

  // Get selected node data for side panel
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedNodeMetadata = useMemo(() => {
    if (!selectedNode) return null;
    return availableIndicators?.[selectedNode.indicatorId] || null;
  }, [selectedNode, availableIndicators]);

  // DnD sensors - improved responsiveness
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8px for better responsiveness
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Handle drag end - both library to canvas and node repositioning
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    
    // Check if dragging an indicator from library to canvas
    if (over?.id === 'canvas-drop-zone' && typeof active.id === 'string' && availableIndicators?.[active.id]) {
      // Use auto-layout (position will be calculated)
      handleNodeAdd(active.id);
      return;
    }
    
    // Check if dragging a node on the canvas
    const draggedNode = nodes.find(n => n.id === active.id);
    if (draggedNode && over?.id === 'canvas-drop-zone') {
      // Calculate new position accounting for zoom
      // delta is in screen coordinates, need to convert to canvas coordinates
      const canvasRef = document.querySelector('[data-nodes-container]') as HTMLElement;
      if (canvasRef) {
        // Get zoom from data attribute (more reliable than parsing transform)
        const zoom = parseFloat(canvasRef.getAttribute('data-zoom') || '1');
        
        // Apply delta accounting for zoom
        const newX = draggedNode.x + delta.x / zoom;
        const newY = draggedNode.y + delta.y / zoom;
        
        // Bounds checking
        const minX = 0;
        const minY = 0;
        const maxX = 5000; // Reasonable canvas bounds
        const maxY = 5000;
        
        const boundedX = Math.max(minX, Math.min(maxX, newX));
        const boundedY = Math.max(minY, Math.min(maxY, newY));
        
        handleNodeMove(active.id as string, boundedX, boundedY);
      }
    }
  }, [availableIndicators, handleNodeAdd, nodes, handleNodeMove]);

  // Handle click to add indicator
  const handleIndicatorClick = useCallback((indicatorId: string) => {
    handleNodeAdd(indicatorId);
  }, [handleNodeAdd]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Optional: track drag start for visual feedback
  }, []);

  // Handle connection point click
  const handleConnectionPointClick = useCallback((nodeId: string, point: 'input' | 'output', e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (point === 'output') {
      // Start connection from this node
      setConnectingFrom({ nodeId, point: 'output' });
    } else if (point === 'input' && connectingFrom) {
      // Complete connection to this node
      // Show AND/OR selector
      const connectionType = window.confirm('Use AND logic? (OK for AND, Cancel for OR)') ? 'AND' : 'OR';
      
      // Check if connection already exists
      const existingConnection = connections.find(
        c => c.from === connectingFrom.nodeId && c.to === nodeId
      );
      
      if (!existingConnection) {
        const newConnection: FlowchartConnection = {
          id: `conn-${connectingFrom.nodeId}-${nodeId}-${Date.now()}`,
          from: connectingFrom.nodeId,
          to: nodeId,
          type: connectionType,
        };
        setConnections(prev => [...prev, newConnection]);
        if (onConnectionAdd) {
          onConnectionAdd(connectingFrom.nodeId, nodeId, connectionType);
        }
      }
      
      setConnectingFrom(null);
    }
  }, [connectingFrom, connections]);

  // Handle canvas click to cancel connection
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (connectingFrom && (e.target as HTMLElement).closest('.indicator-node') === null) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  // Track mouse position for connection preview
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (connectingFrom && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [connectingFrom]);

  // Helper to generate expression for a node (defined first since it's used by generateExpressionFromConnections)
  const generateExpressionForNode = useCallback((
    nodeId: string,
    nodeMap: Map<string, FlowchartNode>,
    connectionsByTo: Map<string, FlowchartConnection[]>,
    visited: Set<string>
  ): string => {
    if (visited.has(nodeId)) return '';
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return '';

    // Get incoming connections
    const incoming = connectionsByTo.get(nodeId) || [];
    
    if (incoming.length === 0) {
      // No inputs - this is a condition node
      // Get first available condition for this indicator
      const metadata = availableIndicators?.[node.indicatorId];
      if (metadata?.conditions) {
        const firstCondition = Object.keys(metadata.conditions)[0];
        return firstCondition || '';
      }
      return '';
    }

    // Combine inputs with AND/OR based on connection types
    const inputExpressions = incoming.map(conn => {
      const inputExpr = generateExpressionForNode(conn.from, nodeMap, connectionsByTo, visited);
      return { expr: inputExpr, type: conn.type };
    }).filter(item => item.expr);

    if (inputExpressions.length === 0) return '';

    // Group by connection type
    const andExpressions: string[] = [];
    const orExpressions: string[] = [];

    inputExpressions.forEach(({ expr, type }) => {
      if (type === 'AND') {
        andExpressions.push(expr);
      } else {
        orExpressions.push(expr);
      }
    });

    const parts: string[] = [];
    if (andExpressions.length > 0) {
      parts.push(andExpressions.join(' AND '));
    }
    if (orExpressions.length > 0) {
      parts.push(orExpressions.join(' OR '));
    }

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `(${parts.join(' AND ')})`;
  }, [availableIndicators]);

  // Generate expression from connections
  const generateExpressionFromConnections = useCallback(() => {
    // If no connections, generate a simple expression from all nodes
    if (connections.length === 0) {
      if (nodes.length === 0) {
        return '';
      }
      
      // Generate simple AND expression from all indicators
      const conditions: string[] = [];
      nodes.forEach(node => {
        const metadata = availableIndicators?.[node.indicatorId];
        if (metadata?.conditions) {
          const firstCondition = Object.keys(metadata.conditions)[0];
          if (firstCondition) {
            conditions.push(firstCondition);
          }
        }
      });
      
      return conditions.length > 0 ? conditions.join(' AND ') : '';
    }
    
    if (nodes.length === 0) {
      return '';
    }

    // Build a graph of connections
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const connectionsByTo = new Map<string, FlowchartConnection[]>();
    
    connections.forEach(conn => {
      if (!connectionsByTo.has(conn.to)) {
        connectionsByTo.set(conn.to, []);
      }
      connectionsByTo.get(conn.to)!.push(conn);
    });

    // Find entry nodes (nodes with no incoming connections)
    const entryNodes = nodes.filter(node => !connections.some(c => c.to === node.id));
    
    if (entryNodes.length === 0) {
      // All nodes have inputs, start from leftmost
      const leftmost = nodes.reduce((left, node) => node.x < left.x ? node : left);
      return generateExpressionForNode(leftmost.id, nodeMap, connectionsByTo, new Set());
    }

    // Generate expression starting from entry nodes
    const expressions: string[] = [];
    const visited = new Set<string>();

    entryNodes.forEach(node => {
      const expr = generateExpressionForNode(node.id, nodeMap, connectionsByTo, visited);
      if (expr) {
        expressions.push(expr);
      }
    });

    return expressions.join(' AND ');
  }, [connections, nodes, generateExpressionForNode]);

  // Memoize the generated expression to avoid recalculating on every render
  const generatedExpression = useMemo(() => {
    try {
      return generateExpressionFromConnections();
    } catch (error) {
      console.error('Error generating expression:', error);
      return '';
    }
  }, [generateExpressionFromConnections]);

  // Update expression when connections change
  React.useEffect(() => {
    if (onUpdateExpression && !useSeparateExpressions && generatedExpression) {
      onUpdateExpression(generatedExpression);
    }
  }, [generatedExpression, onUpdateExpression, useSeparateExpressions]);

  // Connection add handler
  const onConnectionAdd = useCallback((from: string, to: string, type: 'AND' | 'OR') => {
    // Expression will be auto-generated by useEffect above
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={canvasRef}
        className="flex h-[calc(100vh-200px)] gap-4"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
      >
          {/* Indicator Library */}
          <div className="w-80 flex-shrink-0">
            <IndicatorLibrary
              availableIndicators={availableIndicators}
              selectedIndicatorIds={selectedIndicators.map(ind => ind.id)}
              isLoading={isLoading}
              onAddIndicator={handleIndicatorClick}
            />
          </div>

          {/* Flowchart Canvas */}
          <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedNodeId ? '' : ''}`}>
            <FlowchartCanvas
              nodes={nodes}
              connections={connections}
              availableIndicators={availableIndicators}
              onNodeAdd={handleNodeAdd}
              onNodeMove={handleNodeMove}
              onNodeSelect={handleNodeSelect}
              onNodeRemove={handleNodeRemove}
              onConnectionAdd={onConnectionAdd}
              onConnectionRemove={(id) => setConnections(prev => prev.filter(c => c.id !== id))}
              onConnectionPointClick={handleConnectionPointClick}
              selectedNodeId={selectedNodeId}
              connectingFrom={connectingFrom}
              mousePosition={mousePosition}
            />
          </div>

          {/* Side Panel */}
          <SidePanel
            isOpen={selectedNodeId !== null}
            onClose={() => setSelectedNodeId(null)}
            nodeId={selectedNodeId}
            indicatorConfig={selectedNode?.config || null}
            indicatorMetadata={selectedNodeMetadata}
            onConfigUpdate={handleConfigUpdate}
            onRemove={() => {
              if (selectedNodeId) {
                handleNodeRemove(selectedNodeId);
              }
            }}
            initialCapital={initialCapital}
            onUpdateInitialCapital={onUpdateInitialCapital}
            onRunBacktest={onRunBacktest}
            isBacktestLoading={isBacktestLoading}
            strategyType={strategyType}
            availableConditions={availableConditions}
            expression={generatedExpression}
            onUpdateExpression={onUpdateExpression}
            useSeparateExpressions={useSeparateExpressions}
            backtestResults={backtestResults}
          />
      </div>

      {/* Compact Summary */}
      {selectedIndicators.length > 0 && (
        <div className="mt-4 p-4 bg-bg-secondary rounded-lg border border-border-default">
          <StrategyDescription
            expression={generatedExpression}
            selectedIndicators={selectedIndicators}
            availableIndicators={availableIndicators}
            availableConditions={availableConditions}
          />
          <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
            <span>Indicators: {selectedIndicators.length}</span>
            <span>Connections: {connections.length}</span>
          </div>
        </div>
      )}
    </DndContext>
  );
};

// Memoize component to prevent unnecessary re-renders when props don't change
export default memo(StrategyBuilder);

