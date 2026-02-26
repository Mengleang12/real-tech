// API Configuration - Laravel API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

// Get API key from localStorage (set after login)
const getApiKey = () => localStorage.getItem('admin_api_key') || '';

// Get user auth token from localStorage
const getUserAuthToken = () => localStorage.getItem('auth_token') || '';

// Get user ID from localStorage (for download access verification)
const getUserId = (): string | null => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.id || null;
    }
  } catch {
    return null;
  }
  return null;
};

interface ApiOptions {
  method?: string;
  body?: unknown;
  requiresAuth?: boolean;
  includeUserId?: boolean; // For download access verification
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = true, includeUserId = false } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (requiresAuth) {
    // Try admin API key first, then fall back to user auth token
    const adminKey = getApiKey();
    const userToken = getUserAuthToken();
    if (adminKey) {
      headers['Authorization'] = `Bearer ${adminKey}`;
    } else if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
  }
  
  // Include user auth token for download access verification on paid apps
  if (includeUserId) {
    const userToken = getUserAuthToken();
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
  }
  
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}

// User API request (uses user auth token instead of admin API key)
async function userApiRequest<T>(endpoint: string, options: Omit<ApiOptions, 'requiresAuth'> = {}): Promise<T> {
  const { method = 'GET', body } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const token = getUserAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}

// App Types
export interface AppVideo {
  id: number;
  app_id: number;
  title: string;
  youtube_url: string;
  sort_order: number;
}

export interface App {
  id: number;
  name: string;
  name_km?: string;
  description?: string;
  description_km?: string;
  category: 'programs' | 'games' | 'extensions' | 'os';
  category_id?: number;
  icon_url?: string;
  developer?: string;
  brand_id?: number;
  website?: string;
  youtube_url?: string;
  is_featured: boolean;
  is_popular: boolean;
  download_count: number;
  latest_version?: string;
  versions?: never[];
  screenshots?: AppScreenshot[];
  videos?: AppVideo[];
  price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  category_relation?: Category;
  brand?: Brand;
  attribute_values?: ProductAttributeValue[];
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
}

// Category & Brand types
export interface Category {
  id: number;
  name: string;
  name_km?: string;
  slug: string;
  description?: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  name_km?: string;
  icon?: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductAttributeValue {
  id: number;
  app_id: number;
  attribute_id: number;
  value: string;
  stock_quantity?: number;
  attribute?: ProductAttribute;
}

export interface ProductVariant {
  id: number;
  app_id: number;
  combination: Record<string, string>; // { "attribute_id": "value" }
  sku?: string;
  stock_quantity: number;
  price_adjustment: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppScreenshot {
  id: number;
  app_id: number;
  image_url: string;
  sort_order: number;
}

export interface PaginatedResponse<T> {
  apps: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AppsQueryParams {
  category?: string;
  search?: string;
  featured?: boolean;
  popular?: boolean;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  page?: number;
  limit?: number;
}

// Apps API - Laravel endpoints
export const appsApi = {
  getAll: async (params?: AppsQueryParams): Promise<{ data: App[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');
    if (params?.popular) query.set('popular', 'true');
    if (params?.minPrice !== undefined) query.set('min_price', params.minPrice.toString());
    if (params?.maxPrice !== undefined) query.set('max_price', params.maxPrice.toString());
    if (params?.freeOnly) query.set('free_only', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    const response = await apiRequest<PaginatedResponse<App>>(
      `apps${queryString ? `?${queryString}` : ''}`, 
      { requiresAuth: false }
    );
    
    return {
      data: response.apps,
      pagination: response.pagination,
    };
  },
  
  getById: async (id: number, asAdmin?: boolean): Promise<App> => {
    if (asAdmin) {
      const response = await apiRequest<{ app: App }>(`apps/${id}`);
      return response.app;
    }
    const response = await apiRequest<{ app: App }>(`apps/${id}`, { requiresAuth: false, includeUserId: true });
    return response.app;
  },
  
  create: (data: Omit<Partial<App>, 'screenshots' | 'videos' | 'attribute_values' | 'variants'> & { screenshots?: string[]; videos?: { title: string; youtube_url: string }[]; attribute_values?: { attribute_id: number; value: string }[]; variants?: Omit<ProductVariant, 'id' | 'app_id' | 'created_at' | 'updated_at'>[] }) => 
    apiRequest<{ success: boolean; id: number; message: string }>('apps', { method: 'POST', body: data }),
  
  update: (id: number, data: Omit<Partial<App>, 'screenshots' | 'videos' | 'attribute_values' | 'variants'> & { screenshots?: string[]; videos?: { title: string; youtube_url: string }[]; attribute_values?: { attribute_id: number; value: string }[]; variants?: Omit<ProductVariant, 'id' | 'app_id' | 'created_at' | 'updated_at'>[] }) => 
    apiRequest<{ success: boolean; message: string }>(`apps/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ success: boolean; message: string }>(`apps/${id}`, { method: 'DELETE' }),
};


export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiRequest<{ success: boolean; token: string; user: { id: number; username: string } }>(
      'auth/login',
      { method: 'POST', body: { username, password }, requiresAuth: false }
    );
    
    if (response.success) {
      localStorage.setItem('admin_api_key', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
    }
    
    return response;
  },
  
  changePassword: async (username: string, currentPassword: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      'auth/change-password',
      { method: 'POST', body: { username, current_password: currentPassword, new_password: newPassword } }
    );
  },
  
  logout: () => {
    localStorage.removeItem('admin_api_key');
    localStorage.removeItem('admin_user');
  },
  
  isAuthenticated: () => !!localStorage.getItem('admin_api_key'),
  
  getUser: () => {
    const user = localStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  },
};

// Upload API - Laravel endpoint
export const uploadApi = {
  upload: async (file: File, type: 'icons' | 'screenshots' | 'versions' | 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
    }
    
    return data as { success: boolean; url: string; filename: string; size: number; mime_type: string };
  },
};

// Admin User Types
export interface AdminUser {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  paid_orders_count?: number;
}

export interface AdminOrder {
  id: string;
  user_id: number;
  app_id: number;
  app_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  bakong_transaction_id?: string;
  payment_md5?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
  user?: {
    id: number;
    email: string;
    full_name?: string;
  };
}

// Admin User Management API
export const adminUsersApi = {
  getAll: async (params?: { search?: string; page?: number; limit?: number }): Promise<{ 
    users: AdminUser[]; 
    pagination: { current_page: number; total_pages: number; total: number; per_page: number } 
  }> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return apiRequest(`admin/users${queryString ? `?${queryString}` : ''}`);
  },
  
  getById: async (id: number): Promise<{ user: AdminUser; orders: AdminOrder[] }> => {
    return apiRequest(`admin/users/${id}`);
  },
  
  getOrders: async (userId: number): Promise<{ user: { id: number; email: string; full_name?: string }; orders: AdminOrder[] }> => {
    return apiRequest(`admin/users/${userId}/orders`);
  },
  
  grantApp: async (userId: number, data: { app_id: number; app_name: string; amount?: number }): Promise<{ success: boolean; message: string; order: AdminOrder }> => {
    return apiRequest(`admin/users/${userId}/grant-app`, { method: 'POST', body: data });
  },
  
  revokeApp: async (userId: number, appId: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/users/${userId}/revoke-app/${appId}`, { method: 'DELETE' });
  },
  
  getAllOrders: async (params?: { status?: string; user_id?: number; page?: number; limit?: number }): Promise<{
    orders: AdminOrder[];
    pagination: { current_page: number; total_pages: number; total: number; per_page: number }
  }> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.user_id) query.set('user_id', params.user_id.toString());
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    return apiRequest(`admin/orders${queryString ? `?${queryString}` : ''}`);
  },
  
  approveOrder: async (orderId: string): Promise<{ success: boolean; message: string; order: AdminOrder }> => {
    return apiRequest(`admin/orders/${orderId}/approve`, { method: 'POST' });
  },
  
  deleteOrder: async (orderId: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/orders/${orderId}`, { method: 'DELETE' });
  },

  bulkDeleteOrders: async (orderIds: string[]): Promise<{ success: boolean; message: string; deleted_count: number }> => {
    return apiRequest('admin/orders/bulk-delete', { method: 'POST', body: { order_ids: orderIds } });
  },
};

// Analytics Types
export interface AnalyticsStats {
  total_users: number;
  new_users: number;
  total_orders: number;
  paid_orders: number;
  total_revenue: number;
  avg_order_value: number;
  conversion_rate: number;
}

export interface RevenueByDate {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

// Analytics API
export const analyticsApi = {
  getDashboard: async (days: number = 30, from?: string, to?: string): Promise<{
    stats: AnalyticsStats;
    revenue_by_date: RevenueByDate[];
    orders_by_status: OrdersByStatus[];
    recent_orders: AdminOrder[];
    top_apps: { app_id: number; app_name: string; revenue: number; sales: number }[];
  }> => {
    const params = new URLSearchParams();
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
      // Send timezone offset so server can interpret dates in user's local timezone
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60; // e.g. UTC+7 = 7
      const sign = offsetHours >= 0 ? '+' : '-';
      params.set('tz_offset', `${sign}${String(Math.abs(Math.floor(offsetHours))).padStart(2, '0')}:${String(Math.abs(offsetMinutes) % 60).padStart(2, '0')}`);
    } else {
      params.set('days', String(days));
    }
    return apiRequest(`admin/analytics?${params.toString()}`);
  },
};

// Roles Types
export interface UserWithRoles {
  user_id: number;
  full_name: string | null;
  email: string | null;
  roles: string[];
}

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export interface PermissionsData {
  permissions: PermissionDef[];
  roles: Record<string, string[]>;
  role_names: string[];
}

// Roles API
export const rolesApi = {
  getAll: async (): Promise<{ users: UserWithRoles[] }> => {
    return apiRequest('admin/roles');
  },
  
  add: async (userId: number, role: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/roles', { method: 'POST', body: { user_id: userId, role } });
  },
  
  remove: async (userId: number, role: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/roles', { method: 'DELETE', body: { user_id: userId, role } });
  },
};

// Permissions API
export const permissionsApi = {
  getAll: async (): Promise<PermissionsData> => {
    return apiRequest<{ success: boolean } & PermissionsData>('admin/permissions').then(r => ({
      permissions: r.permissions,
      roles: r.roles,
      role_names: r.role_names,
    }));
  },

  createRole: async (role: string, permissions: string[]): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/permissions/role', { method: 'POST', body: { role, permissions } });
  },

  updateRole: async (role: string, permissions: string[]): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/permissions/role', { method: 'PUT', body: { role, permissions } });
  },

  deleteRole: async (role: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/permissions/role/${role}`, { method: 'DELETE' });
  },
};

// Activity Log Types
export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { id: number; email: string; full_name?: string };
}

// Activity Logs API
export const activityLogsApi = {
  getAll: async (params?: { days?: number; action?: string; limit?: number; user_id?: number; page?: number; per_page?: number }): Promise<{
    logs: ActivityLog[];
    actions: string[];
    stats: { total: number; logins: number; purchases: number; downloads: number };
    pagination: { current_page: number; last_page: number; per_page: number; total: number };
  }> => {
    const query = new URLSearchParams();
    if (params?.days) query.set('days', params.days.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.user_id) query.set('user_id', params.user_id.toString());
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());
    
    const queryString = query.toString();
    return apiRequest(`admin/activity-logs${queryString ? `?${queryString}` : ''}`);
  },
  
  trackDownload: async (appId: number, appName: string, version?: string): Promise<{ success: boolean }> => {
    return apiRequest('track-download', { 
      method: 'POST', 
      body: { app_id: appId, app_name: appName, version } 
    });
  },
};

// User Status Types
export interface UserWithStatus {
  user_id: number;
  full_name: string | null;
  email: string | null;
  created_at: string;
  status: {
    id: number;
    status: 'active' | 'suspended' | 'banned';
    reason: string | null;
    suspended_until: string | null;
    updated_at: string;
  } | null;
}

// User Status API
export const userStatusApi = {
  getAll: async (status?: string): Promise<{
    users: UserWithStatus[];
    stats: { active: number; suspended: number; banned: number };
  }> => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`admin/user-status${query}`);
  },
  
  update: async (userId: number, data: { status: string; reason?: string; suspended_until?: string }): Promise<{ success: boolean; message: string }> => {
    return apiRequest('admin/user-status', { method: 'POST', body: { user_id: userId, ...data } });
  },
};

// Notification Types
export interface AdminNotification {
  id: number;
  title: string;
  title_km: string | null;
  message: string;
  message_km: string | null;
  type: 'announcement' | 'update' | 'promotion' | 'system';
  target_users: 'all' | 'admins' | 'specific';
  specific_user_ids: number[] | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Notifications API
export const notificationsApi = {
  getAll: async (): Promise<{ notifications: AdminNotification[] }> => {
    return apiRequest('admin/notifications');
  },
  
  create: async (data: Omit<AdminNotification, 'id' | 'created_at'>): Promise<{ success: boolean; notification: AdminNotification }> => {
    return apiRequest('admin/notifications', { method: 'POST', body: data });
  },
  
  update: async (id: number, data: Partial<AdminNotification>): Promise<{ success: boolean; notification: AdminNotification }> => {
    return apiRequest(`admin/notifications/${id}`, { method: 'PUT', body: data });
  },
  
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/notifications/${id}`, { method: 'DELETE' });
  },
};

// App Submission Types
export interface AppSubmission {
  id: number;
  app_id: number;
  version: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  submitted_by: number;
  reviewed_by: number | null;
  review_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  app?: { id: number; name: string; icon_url?: string };
  submittedBy?: { id: number; email: string; full_name?: string };
}

// App Submissions API
export const submissionsApi = {
  getAll: async (status?: string): Promise<{
    submissions: AppSubmission[];
    stats: { pending: number; approved: number; rejected: number; suspended: number };
  }> => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return apiRequest(`admin/submissions${query}`);
  },
  
  update: async (id: number, data: { status: string; review_notes?: string; rejection_reason?: string }): Promise<{ success: boolean; submission: AppSubmission }> => {
    return apiRequest(`admin/submissions/${id}`, { method: 'PUT', body: data });
  },
};

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_price: number;
  max_discount?: number;
  expires_at?: string;
  is_active: boolean;
  user_coupons_count?: number;
  used_count?: number;
  created_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: number;
  coupon_id: string;
  is_used: boolean;
  used_at?: string;
  user?: { id: number; name: string; email: string };
  coupon?: Coupon;
}

export interface ApplicableCoupon {
  id: string;
  coupon: Coupon;
  discount_amount: number;
}

// Coupons API - Admin
export const couponsApi = {
  // Admin endpoints
  getAll: async (): Promise<{ coupons: Coupon[] }> => {
    return apiRequest('admin/coupons');
  },
  
  create: async (data: Partial<Coupon>): Promise<{ coupon: Coupon; message: string }> => {
    return apiRequest('admin/coupons', { method: 'POST', body: data });
  },
  
  update: async (id: string, data: Partial<Coupon>): Promise<{ coupon: Coupon; message: string }> => {
    return apiRequest(`admin/coupons/${id}`, { method: 'PUT', body: data });
  },
  
  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`admin/coupons/${id}`, { method: 'DELETE' });
  },
  
  assignToUsers: async (couponId: string, userIds: number[]): Promise<{ message: string; assigned_count: number }> => {
    return apiRequest(`admin/coupons/${couponId}/assign`, { method: 'POST', body: { user_ids: userIds } });
  },
  
  getCouponUsers: async (couponId: string): Promise<{ user_coupons: UserCoupon[] }> => {
    return apiRequest(`admin/coupons/${couponId}/users`);
  },
  
  removeFromUser: async (couponId: string, userId: number): Promise<{ message: string }> => {
    return apiRequest(`admin/coupons/${couponId}/users/${userId}`, { method: 'DELETE' });
  },
  
  // User endpoints
  getMyAvailable: async (): Promise<{ coupons: ApplicableCoupon[] }> => {
    return userApiRequest('coupons/my');
  },
  
  getApplicable: async (price: number): Promise<{ coupons: ApplicableCoupon[] }> => {
    return userApiRequest(`coupons/applicable?price=${price}`);
  },
  
  apply: async (userCouponId: string, orderId: string, price?: number): Promise<{ message: string; discount: number }> => {
    return userApiRequest('coupons/apply', { method: 'POST', body: { user_coupon_id: userCouponId, order_id: orderId, price } });
  },
};


// Categories API
export const categoriesApi = {
  getAll: async (): Promise<{ categories: Category[] }> =>
    apiRequest('categories', { requiresAuth: false }),
  create: async (data: Partial<Category>): Promise<{ success: boolean; category: Category }> =>
    apiRequest('admin/categories', { method: 'POST', body: data }),
  update: async (id: number, data: Partial<Category>): Promise<{ success: boolean; category: Category }> =>
    apiRequest(`admin/categories/${id}`, { method: 'PUT', body: data }),
  delete: async (id: number): Promise<{ success: boolean; message: string }> =>
    apiRequest(`admin/categories/${id}`, { method: 'DELETE' }),
};

// Brands API
export const brandsApi = {
  getAll: async (): Promise<{ brands: Brand[] }> =>
    apiRequest('brands', { requiresAuth: false }),
  create: async (data: Partial<Brand>): Promise<{ success: boolean; brand: Brand }> =>
    apiRequest('admin/brands', { method: 'POST', body: data }),
  update: async (id: number, data: Partial<Brand>): Promise<{ success: boolean; brand: Brand }> =>
    apiRequest(`admin/brands/${id}`, { method: 'PUT', body: data }),
  delete: async (id: number): Promise<{ success: boolean; message: string }> =>
    apiRequest(`admin/brands/${id}`, { method: 'DELETE' }),
};

// Product Attributes API
export const productAttributesApi = {
  getAll: async (): Promise<{ attributes: ProductAttribute[] }> =>
    apiRequest('product-attributes', { requiresAuth: false }),
  create: async (data: Partial<ProductAttribute>): Promise<{ success: boolean; attribute: ProductAttribute }> =>
    apiRequest('admin/product-attributes', { method: 'POST', body: data }),
  update: async (id: number, data: Partial<ProductAttribute>): Promise<{ success: boolean; attribute: ProductAttribute }> =>
    apiRequest(`admin/product-attributes/${id}`, { method: 'PUT', body: data }),
  delete: async (id: number): Promise<{ success: boolean; message: string }> =>
    apiRequest(`admin/product-attributes/${id}`, { method: 'DELETE' }),
};
