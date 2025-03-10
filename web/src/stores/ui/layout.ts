/**
 * UI layout store for managing UI state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LayoutState {
  // Navigation
  isMenuOpen: boolean;
  
  // Actions
  toggleMenu: () => void;
  setMenuOpen: (isOpen: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Initial state
      isMenuOpen: false,
      
      // Actions
      toggleMenu: () => set((state) => ({ 
        isMenuOpen: !state.isMenuOpen 
      })),
      
      setMenuOpen: (isOpen) => set({ 
        isMenuOpen: isOpen 
      }),
    }),
    {
      name: 'mandrake-layout',
    }
  )
);
