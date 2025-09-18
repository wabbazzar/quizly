import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  CSSProperties,
} from 'react';
import styles from './VirtualScrollList.module.css';

export interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  getItemId?: (item: T, index: number) => string | number;
  gap?: number;
  horizontal?: boolean;
}

interface ItemStyle {
  position: 'absolute';
  top?: number;
  left?: number;
  width?: string | number;
  height?: string | number;
}

/**
 * High-performance virtual scrolling component for large lists
 * Optimized for mobile and desktop performance
 */
export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  getItemId,
  gap = 0,
  horizontal = false,
}: VirtualScrollListProps<T>) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate item positions and heights
  const itemMetrics = useMemo(() => {
    let offset = 0;
    const metrics: Array<{ offset: number; size: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const size = typeof itemHeight === 'function'
        ? itemHeight(i, items[i])
        : itemHeight;

      metrics.push({ offset, size });
      offset += size + gap;
    }

    return {
      items: metrics,
      totalSize: offset - gap, // Remove last gap
    };
  }, [items, itemHeight, gap]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = scrollOffset;
    const end = scrollOffset + containerHeight;

    let startIndex = 0;
    let endIndex = items.length - 1;

    // Binary search for start index
    let low = 0;
    let high = items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const item = itemMetrics.items[mid];

      if (item.offset <= start) {
        startIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Binary search for end index
    low = startIndex;
    high = items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const item = itemMetrics.items[mid];

      if (item.offset + item.size <= end) {
        low = mid + 1;
      } else {
        endIndex = mid;
        high = mid - 1;
      }
    }

    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(items.length - 1, endIndex + overscan);

    return { startIndex, endIndex };
  }, [scrollOffset, containerHeight, itemMetrics, overscan, items.length]);

  // Visible items with positioning
  const visibleItems = useMemo(() => {
    const visible = [];

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const item = items[i];
      const metrics = itemMetrics.items[i];

      if (!item) continue;

      const style: ItemStyle = {
        position: 'absolute',
      };

      if (horizontal) {
        style.left = metrics.offset;
        style.width = metrics.size;
        style.height = '100%';
      } else {
        style.top = metrics.offset;
        style.height = metrics.size;
        style.width = '100%';
      }

      const key = getItemId ? getItemId(item, i) : i;

      visible.push({
        key,
        index: i,
        item,
        style,
      });
    }

    return visible;
  }, [visibleRange, items, itemMetrics, horizontal, getItemId]);

  // Handle scroll with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newScrollOffset = horizontal ? target.scrollLeft : target.scrollTop;

    setScrollOffset(newScrollOffset);
    setIsScrolling(true);

    onScroll?.(target.scrollTop, target.scrollLeft);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [horizontal, onScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current || index < 0 || index >= items.length) return;

    const metrics = itemMetrics.items[index];
    let targetOffset = metrics.offset;

    switch (align) {
      case 'center':
        targetOffset = metrics.offset - (containerHeight - metrics.size) / 2;
        break;
      case 'end':
        targetOffset = metrics.offset - containerHeight + metrics.size;
        break;
    }

    // Clamp to valid range
    targetOffset = Math.max(0, Math.min(targetOffset, itemMetrics.totalSize - containerHeight));

    if (horizontal) {
      containerRef.current.scrollLeft = targetOffset;
    } else {
      containerRef.current.scrollTop = targetOffset;
    }
  }, [items.length, itemMetrics, containerHeight, horizontal]);

  // Container style
  const containerStyle: CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    ...(horizontal && { overflowY: 'hidden', overflowX: 'auto' }),
  };

  // Scrollable area style
  const scrollAreaStyle: CSSProperties = horizontal
    ? {
        width: itemMetrics.totalSize,
        height: '100%',
        position: 'relative',
      }
    : {
        height: itemMetrics.totalSize,
        width: '100%',
        position: 'relative',
      };

  return (
    <div
      ref={containerRef}
      className={`${styles.virtualScrollContainer} ${className || ''}`}
      style={containerStyle}
      onScroll={handleScroll}
      data-scrolling={isScrolling}
    >
      <div
        className={styles.scrollArea}
        style={scrollAreaStyle}
      >
        {visibleItems.map(({ key, index, item, style }) => (
          <div
            key={key}
            className={styles.virtualItem}
            style={style}
            data-index={index}
          >
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for managing virtual scroll state
export function useVirtualScrollList<T>(items: T[]) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // Measure container height
  useEffect(() => {
    if (!containerRef) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return {
    containerRef: setContainerRef,
    containerHeight,
    itemCount: items.length,
  };
}

// Performance-optimized list item wrapper
export const VirtualListItem = React.memo<{
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}>(({ children, className, style }) => (
  <div
    className={`${styles.listItem} ${className || ''}`}
    style={style}
  >
    {children}
  </div>
));

VirtualListItem.displayName = 'VirtualListItem';

export default VirtualScrollList;