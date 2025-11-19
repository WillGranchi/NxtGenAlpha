/**
 * Connection line component for flowchart connections
 */

import React from 'react';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'AND' | 'OR';
  onClick?: () => void;
  isPreview?: boolean;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, type, onClick, isPreview = false }) => {
  const color = type === 'AND' ? '#3B82F6' : '#A855F7';
  
  // Calculate control points for smooth curve
  const dx = to.x - from.x;
  const controlX1 = from.x + dx * 0.5;
  const controlX2 = from.x + dx * 0.5;
  
  const path = `M ${from.x} ${from.y} C ${controlX1} ${from.y}, ${controlX2} ${to.y}, ${to.x} ${to.y}`;

  return (
    <g>
      {/* Connection dots at endpoints */}
      {!isPreview && (
        <>
          <circle
            cx={from.x}
            cy={from.y}
            r="4"
            fill={color}
            stroke="#0A0A0A"
            strokeWidth="1"
            className="pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }}
          />
          <circle
            cx={to.x}
            cy={to.y}
            r="4"
            fill={color}
            stroke="#0A0A0A"
            strokeWidth="1"
            className="pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }}
          />
        </>
      )}
      <path
        d={path}
        stroke={color}
        strokeWidth={isPreview ? "2" : "2.5"}
        strokeDasharray={isPreview ? "5,5" : "none"}
        fill="none"
        markerEnd={isPreview ? undefined : "url(#arrowhead)"}
        className={onClick ? "cursor-pointer pointer-events-auto" : ""}
        onClick={onClick}
        style={{ 
          opacity: isPreview ? 0.6 : 1,
          filter: isPreview ? 'none' : 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.3))'
        }}
        pointerEvents={onClick ? "auto" : "none"}
      />
      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill={color}
          />
        </marker>
      </defs>
      {/* Type label */}
      <text
        x={(from.x + to.x) / 2}
        y={(from.y + to.y) / 2 - 5}
        fill={color}
        fontSize="10"
        fontWeight="bold"
        textAnchor="middle"
        className="pointer-events-none"
        style={{ 
          textShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
          filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))'
        }}
      >
        {type}
      </text>
    </g>
  );
};

