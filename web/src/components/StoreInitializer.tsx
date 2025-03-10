/**
 * Initializes global stores on client side
 */
'use client';

import { useEffect } from 'react';
import { initStores } from '@/stores';

export default function StoreInitializer() {
  // Initialize stores when component mounts (client-side only)
  useEffect(() => {
    initStores();
  }, []);
  
  // This component doesn't render anything
  return null;
}