import { useState, useRef, useCallback, useEffect } from 'react';
import { EDITOR_MIN_HEIGHT, EDITOR_MAX_HEIGHT_OFFSET, EDITOR_DEFAULT_HEIGHT } from '../constants';

interface UseResizablePanelOptions {
  defaultHeight?: number;
  minHeight?: number;
  maxHeightOffset?: number;
}

interface UseResizablePanelReturn {
  height: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useResizablePanel(options: UseResizablePanelOptions = {}): UseResizablePanelReturn {
  const {
    defaultHeight = EDITOR_DEFAULT_HEIGHT,
    minHeight = EDITOR_MIN_HEIGHT,
    maxHeightOffset = EDITOR_MAX_HEIGHT_OFFSET,
  } = options;

  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY.current;
    const newHeight = resizeStartHeight.current + deltaY;

    const maxHeight = window.innerHeight - maxHeightOffset;
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    setHeight(clampedHeight);
  }, [isResizing, minHeight, maxHeightOffset]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    height,
    isResizing,
    handleMouseDown,
  };
}
