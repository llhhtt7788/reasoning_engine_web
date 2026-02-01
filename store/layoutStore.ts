import { create } from 'zustand';

type LayoutState = {
  activeView: 'chat' | 'knowledge' | 'settings';
  isSessionSidebarOpen: boolean;
  setActiveView: (view: 'chat' | 'knowledge' | 'settings') => void;
  toggleSessionSidebar: () => void;
  setSessionSidebarOpen: (isOpen: boolean) => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  activeView: 'chat',
  isSessionSidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  toggleSessionSidebar: () => set((state) => ({ isSessionSidebarOpen: !state.isSessionSidebarOpen })),
  setSessionSidebarOpen: (isOpen) => set({ isSessionSidebarOpen: isOpen }),
}));
