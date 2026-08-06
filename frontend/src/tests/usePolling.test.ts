import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePolling } from '../hooks/usePolling';

// Assuming usePolling takes a callback and an interval
describe('usePolling Hook', () => {
  it('should call the callback at the specified interval (Logical Validation)', () => {
    vi.useFakeTimers();
    const mockCallback = vi.fn();
    
    // The hook signature: usePolling(callback, intervalMs)
    renderHook(() => usePolling(mockCallback, 1000));
    
    expect(mockCallback).not.toHaveBeenCalled();
    
    // Fast-forward time by 1000ms
    vi.advanceTimersByTime(1000);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(1000);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    
    vi.useRealTimers();
  });
});
