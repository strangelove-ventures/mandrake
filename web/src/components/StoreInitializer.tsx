/**
 * Initializes global stores on client side
 */
'use client';

import { useEffect, useState } from 'react';
import { initStores, useWorkspaceStore } from '@/stores';

export default function StoreInitializer() {
  // Track initialization state
  const [initialized, setInitialized] = useState(false);
  
  // Get load workspaces function
  const loadWorkspaces = useWorkspaceStore(state => state.loadWorkspaces);
  
  // Initialize stores when component mounts (client-side only)
  useEffect(() => {
    if (!initialized) {
      console.log('Initializing stores and loading data...');
      initStores();
      
      // Load data after a short delay to ensure stores are fully initialized
      setTimeout(() => {
        console.log('Loading workspaces from initializer...');
        loadWorkspaces().catch(err => console.error('Failed to load workspaces:', err));
      }, 100);
      
      setInitialized(true);
    }
  }, [initialized, loadWorkspaces]);
  
  // Return an empty fragment instead of null
  return <></>;
}