import { create } from 'zustand';
import type { SearchResult } from '../services/sources';

interface SearchState {
  keyword: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  setKeyword: (keyword: string) => void;
  setResults: (results: SearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const searchStore = create<SearchState>((set) => ({
  keyword: '',
  results: [],
  loading: false,
  error: null,
  setKeyword: (keyword) => set({ keyword }),
  setResults: (results) => set({ results, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
