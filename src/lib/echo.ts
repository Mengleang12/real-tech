import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally (required by Laravel Echo)
(window as any).Pusher = Pusher;

// Reverb connection config - these are public keys, safe in frontend
const REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'a3f7b2c9e1d4056f8a9b3c7e2f1d0a5b';
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST || 'api.realtechcomputer.com';
const REVERB_PORT = import.meta.env.VITE_REVERB_PORT || 8080;
const REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME || 'http';

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(): Echo<'reverb'> {
  if (!echoInstance) {
    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: REVERB_APP_KEY,
      wsHost: REVERB_HOST,
      wsPort: Number(REVERB_PORT),
      wssPort: Number(REVERB_PORT),
      forceTLS: REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
    });
  }
  return echoInstance;
}
