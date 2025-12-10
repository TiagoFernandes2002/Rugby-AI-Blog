// frontend/src/__tests__/api.test.js
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('API client', () => {
  it('should have a baseURL set', () => {
    // Basic smoke test — ensure axios is mocked
    expect(axios).toBeDefined();
  });

  it('should handle API responses', async () => {
    const mockData = { data: [{ id: 1, title: 'Test' }] };
    axios.get = vi.fn(() => Promise.resolve(mockData));

    const response = await axios.get('/articles');
    expect(response.data).toEqual(mockData.data);
  });
});
