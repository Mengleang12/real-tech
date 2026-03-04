/**
 * Parse warranty_period string (e.g. "6 months", "1 year", "90 days") 
 * and calculate remaining time from a start date.
 */

export interface WarrantyStatus {
  /** Whether warranty has expired */
  expired: boolean;
  /** Human-readable remaining time or "Expired" */
  label: string;
  /** Expiry date */
  expiryDate: Date | null;
  /** Days remaining (negative if expired) */
  daysRemaining: number;
}

/**
 * Parse a warranty period string into milliseconds duration.
 * Supports: "X day(s)", "X month(s)", "X year(s)", "X week(s)"
 */
function parseWarrantyDuration(period: string): number | null {
  const normalized = period.trim().toLowerCase();
  
  // Match patterns like "6 months", "1 year", "90 days", "2 weeks"
  const match = normalized.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/);
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2].replace(/s$/, ''); // normalize plural
  
  const MS_PER_DAY = 86400000;
  
  switch (unit) {
    case 'day':
      return value * MS_PER_DAY;
    case 'week':
      return value * 7 * MS_PER_DAY;
    case 'month':
      return value * 30 * MS_PER_DAY;
    case 'year':
      return value * 365 * MS_PER_DAY;
    default:
      return null;
  }
}

/**
 * Calculate warranty status from warranty_period and start date.
 */
export function getWarrantyStatus(
  warrantyPeriod: string | undefined | null,
  startDate: string | undefined | null
): WarrantyStatus | null {
  if (!warrantyPeriod || !startDate) return null;
  
  const duration = parseWarrantyDuration(warrantyPeriod);
  if (duration === null) {
    // Can't parse, just return the raw text
    return null;
  }
  
  const start = new Date(startDate.replace(/-/g, '/'));
  if (isNaN(start.getTime())) return null;
  
  const expiryDate = new Date(start.getTime() + duration);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / 86400000);
  
  if (daysRemaining <= 0) {
    return {
      expired: true,
      label: 'Expired',
      expiryDate,
      daysRemaining,
    };
  }
  
  // Format remaining time in the most readable unit
  let label: string;
  if (daysRemaining > 365) {
    const years = Math.floor(daysRemaining / 365);
    const months = Math.floor((daysRemaining % 365) / 30);
    label = months > 0 ? `${years}y ${months}m left` : `${years}y left`;
  } else if (daysRemaining > 30) {
    const months = Math.floor(daysRemaining / 30);
    const days = daysRemaining % 30;
    label = days > 0 ? `${months}m ${days}d left` : `${months}m left`;
  } else {
    label = `${daysRemaining}d left`;
  }
  
  return {
    expired: false,
    label,
    expiryDate,
    daysRemaining,
  };
}

/**
 * Get a CSS-friendly color class based on warranty status.
 */
export function getWarrantyColorClass(status: WarrantyStatus): string {
  if (status.expired) return 'text-destructive';
  if (status.daysRemaining <= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

/**
 * Get warranty badge variant for shadcn Badge component.
 */
export function getWarrantyBadgeVariant(status: WarrantyStatus): 'destructive' | 'warning' | 'default' {
  if (status.expired) return 'destructive';
  if (status.daysRemaining <= 30) return 'warning';
  return 'default';
}

/**
 * Format warranty status for printed invoice HTML.
 */
export function getWarrantyHtml(
  warrantyPeriod: string | undefined | null,
  startDate: string | undefined | null
): string {
  if (!warrantyPeriod) return '';
  
  const status = getWarrantyStatus(warrantyPeriod, startDate);
  const statusText = status 
    ? (status.expired 
        ? '<span style="color:#dc2626;font-weight:600"> (Expired)</span>'
        : `<span style="color:#16a34a;font-weight:600"> (${status.label})</span>`)
    : '';
  
  const expiryText = status?.expiryDate
    ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">Expires: ${status.expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>`
    : '';
  
  const borderColor = status?.expired ? '#dc2626' : '#16a34a';
  const bgColor = status?.expired ? '#fef2f2' : '#f0fdf4';
  
  return `<div style="margin-top:24px;padding:16px 20px;background:${bgColor};border-radius:10px;border-left:3px solid ${borderColor}">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:6px">Warranty</div>
    <div style="font-size:13px;color:#374151;line-height:1.6">${warrantyPeriod}${statusText}</div>
    ${expiryText}
  </div>`;
}
