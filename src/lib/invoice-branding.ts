const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

export interface InvoiceBranding {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  support_email: string;
  support_phone: string;
  site_address: string;
  primary_color: string;
  invoice_footer_text: string;
  default_currency: string;
  payment_qr_urls: string[];
  payment_qr_size: number;
}

const defaults: InvoiceBranding = {
  site_name: 'Realtech Computer',
  site_tagline: 'Software & Digital Products',
  site_logo_url: '',
  support_email: '',
  support_phone: '',
  site_address: '',
  primary_color: '#2563eb',
  invoice_footer_text: 'Thank you for your purchase!',
  default_currency: 'USD',
  payment_qr_urls: [],
};

let cache: InvoiceBranding | null = null;

export async function getInvoiceBranding(): Promise<InvoiceBranding> {
  if (cache) return cache;
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/settings/branding`);
    if (!res.ok) return defaults;
    const data = await res.json();
    cache = { ...defaults, ...data };
    return cache!;
  } catch {
    return defaults;
  }
}

/** Call after saving settings to bust cache */
export function clearBrandingCache() {
  cache = null;
}
