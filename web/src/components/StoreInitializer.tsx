/**
 * Initializes global stores on client side
 */
'use client';

import { useEffect, useState } from 'react';
import { initStores } from '@/stores';

export default function StoreInitializer() {
  // Track initialization state
  const [initialized, setInitialized] = useState(false);
  
  // Initialize stores when component mounts (client-side only)
  useEffect(() => {
    if (!initialized) {
      console.log('Initializing stores and loading data...');
      initStores();
      setInitialized(true);
    }
  }, [initialized]);
  
  // Return an empty fragment instead of null
  return <></>;
}