'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ColorWheelProps {
  value: string;
  onChange: (color: string) => void;
  size?: number;
}

export function ColorWheel({ value, onChange, size = 200 }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Draw color wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Create gradient for saturation
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [size]);

  // Handle color selection
  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Constrain to circle
    const constrainedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);
    
    // Calculate hue and saturation
    const hue = ((angle * 180) / Math.PI + 360) % 360;
    const saturation = (constrainedDistance / radius) * 100;
    
    const color = `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, 50%)`;
    onChange(color);
  }, [onChange, size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    handleInteraction(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Preset colors
  const presetColors = [
    '#10b981', // Green (default)
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#1e293b', // Slate
  ];

  return (
    <div className="space-y-4">
      {/* Color Wheel Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="cursor-crosshair rounded-full shadow-inner"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Current Color Display */}
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl border-2 border-slate-200 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700">Selected Color</p>
          <p className="text-xs text-slate-500 font-mono">{value}</p>
        </div>
      </div>

      {/* Preset Colors */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Presets</p>
        <div className="flex flex-wrap gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                value === color ? 'border-slate-900 scale-110' : 'border-slate-200'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Manual Input */}
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#10b981'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#10b981 or hsl(160, 84%, 39%)"
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
        />
      </div>
    </div>
  );
}
