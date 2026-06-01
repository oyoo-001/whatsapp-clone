import { create } from "zustand";

const useCallStore = create((set) => ({
  activeCall: null,
  setActiveCall: (call) => set({ activeCall: call }),
  clearActiveCall: () => set({ activeCall: null }),
}));

export default useCallStore;
