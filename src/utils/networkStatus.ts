import NetInfo from '@react-native-community/netinfo';

let isConnected = true; // Default to true to avoid offline flash at startup
let listeners: Set<(isConnected: boolean) => void> = new Set();
let isInitialized = false;

// Initialize NetInfo listener once when module loads
function initializeNetworkListener() {
  if (isInitialized) return;

  // Get initial state
  NetInfo.fetch().then((state) => {
    isConnected = state.isConnected ?? true;
    notifyListeners();
  }).catch(() => {
    // Keep default true if fetch fails
  });

  // Subscribe to changes
  const unsubscribe = NetInfo.addEventListener((state) => {
    isConnected = state.isConnected ?? true;
    notifyListeners();
  });

  isInitialized = true;
}

function notifyListeners() {
  listeners.forEach((callback) => {
    try {
      callback(isConnected);
    } catch (error) {
      console.error('[NetworkStatus] Error in listener callback:', error);
    }
  });
}

// Initialize on module load
initializeNetworkListener();

export function getIsConnected(): boolean {
  return isConnected;
}

export function subscribeToNetworkChanges(
  callback: (isConnected: boolean) => void
): () => void {
  listeners.add(callback);

  // Immediately call with current state
  try {
    callback(isConnected);
  } catch (error) {
    console.error('[NetworkStatus] Error in initial callback:', error);
  }

  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}
