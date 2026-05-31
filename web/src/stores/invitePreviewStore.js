import { create } from 'zustand';

const useInvitePreviewStore = create((set) => ({
  isOpen: false,
  type: null, // 'channel' | 'group'
  code: null,
  data: null,
  loading: false,
  error: null,
  open: (type, code) => set({ isOpen: true, type, code, data: null, error: null, loading: true }),
  setData: (data) => set({ data, loading: false }),
  setError: (err) => set({ error: err, loading: false }),
  close: () => set({ isOpen: false, type: null, code: null, data: null, error: null, loading: false }),
}));

export default useInvitePreviewStore;
