import { useState, useEffect } from 'react';
import { subscribeToNetworkChanges } from '../utils/networkStatus';

export function useNetworkStatus(): boolean {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isConnected;
}
