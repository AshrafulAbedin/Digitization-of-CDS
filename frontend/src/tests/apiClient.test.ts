import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost } from '../api/client';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully GET data (Minor Bug Detection)', async () => {
    // Mock the global fetch
    const mockResponse = { data: 'test-data' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiGet('/test-endpoint');
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/test-endpoint');
  });

  it('should throw an error with the backend message on failure (Logical Validation)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Backend validation failed' }),
    });

    await expect(apiPost('/test-endpoint', {})).rejects.toThrow('Backend validation failed');
  });
});
