/**
 * Global label paper size fetched from system settings (Laravel API).
 * Cached in memory for the session; refreshed on page reload.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

interface LabelSize {
  width: number;
  height: number;
}

let cachedSize: LabelSize | null = null;
let fetchPromise: Promise<LabelSize> | null = null;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_api_key') || localStorage.getItem('auth_token') || '';
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchLabelSize(): Promise<LabelSize> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      const size: LabelSize = {
        width: Number(data.label_width) || 40,
        height: Number(data.label_height) || 30,
      };
      cachedSize = size;
      return size;
    }
  } catch {
    // ignore
  }
  return { width: 40, height: 30 };
}

/**
 * Get the global label paper size from system settings.
 * Returns cached value if available, otherwise fetches from API.
 */
export async function getGlobalLabelSize(): Promise<LabelSize> {
  if (cachedSize) return cachedSize;
  if (!fetchPromise) {
    fetchPromise = fetchLabelSize().finally(() => { fetchPromise = null; });
  }
  return fetchPromise;
}

/** Clear cached label size (call after saving settings). */
export function clearLabelSizeCache() {
  cachedSize = null;
}
