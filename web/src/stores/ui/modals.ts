/**
 * Modals state store
 */
import { create } from 'zustand';

export type ModalType = 
  | 'createWorkspace'
  | 'deleteWorkspace'
  | 'editPrompt'
  | 'configureModel'
  | 'configureTool';

interface ModalState {
  // State
  openModals: Record<ModalType, boolean>;
  
  // Actions
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  toggleModal: (modal: ModalType) => void;
  closeAllModals: () => void;
  isModalOpen: (modal: ModalType) => boolean;
}

export const useModalStore = create<ModalState>((set, get) => ({
  // Initial state
  openModals: {
    createWorkspace: false,
    deleteWorkspace: false,
    editPrompt: false,
    configureModel: false,
    configureTool: false,
  },
  
  // Actions
  openModal: (modal) => 
    set((state) => ({
      openModals: {
        ...state.openModals,
        [modal]: true
      }
    })),
    
  closeModal: (modal) => 
    set((state) => ({
      openModals: {
        ...state.openModals,
        [modal]: false
      }
    })),
    
  toggleModal: (modal) => {
    const isOpen = get().openModals[modal];
    set((state) => ({
      openModals: {
        ...state.openModals,
        [modal]: !isOpen
      }
    }));
  },
  
  closeAllModals: () => 
    set({
      openModals: {
        createWorkspace: false,
        deleteWorkspace: false,
        editPrompt: false,
        configureModel: false,
        configureTool: false,
      }
    }),
    
  isModalOpen: (modal) => get().openModals[modal]
}));
