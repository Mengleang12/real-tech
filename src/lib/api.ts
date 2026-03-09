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
  includeUserId?: boolean;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = true, includeUserId = false } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (requiresAuth) {
    const adminKey = getApiKey();
    const userToken = getUserAuthToken();
    if (adminKey) {
      headers['Authorization'] = `Bearer ${adminKey}`;
    } else if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
  }
  
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
    // If admin token expired/invalid, auto-logout and redirect to admin login
    if (response.status === 401 && getApiKey()) {
      localStorage.removeItem('admin_api_key');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_roles');
      localStorage.removeItem('admin_token_time');
      window.location.href = '/admin';
      throw new Error('Session expired. Please login again.');
    }
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

// Product Types
export interface ProductVideo {
  id: number;
  product_id: number;
  title: string;
  youtube_url: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  name_km?: string;
  description?: string;
  description_km?: string;
  category: 'programs' | 'games' | 'extensions' | 'os';
  category_id?: number;
  icon_url?: string;
  brand_id?: number;
  is_featured: boolean;
  is_popular: boolean;
  screenshots?: ProductScreenshot[];
  videos?: ProductVideo[];
  category_relation?: Category;
  brand?: Brand;
  attribute_values?: ProductAttributeValue[];
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Product instead */
export type App = Product;

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

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
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
  product_id: number;
  attribute_id: number;
  value: string;
  stock_quantity?: number;
  attribute?: ProductAttribute;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  combination: Record<string, string>;
  sku?: string;
  stock_quantity: number;
  price_adjustment: number;
  purchase_price?: number;
  is_active: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductScreenshot {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
}

/** @deprecated Use ProductScreenshot instead */
export type AppScreenshot = ProductScreenshot;

export interface PaginatedResponse<T> {
  products: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ProductsQueryParams {
  category?: string;
  category_id?: number;
  search?: string;
  featured?: boolean;
  popular?: boolean;
  minPrice?: number;
  maxPrice?: number;
  freeOnly?: boolean;
  page?: number;
  limit?: number;
}

/** @deprecated Use ProductsQueryParams instead */
export type AppsQueryParams = ProductsQueryParams;

// Products API - Laravel endpoints
export const productsApi = {
  getAll: async (params?: ProductsQueryParams): Promise<{ data: Product[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.category_id) query.set('category_id', params.category_id.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.featured) query.set('featured', 'true');
    if (params?.popular) query.set('popular', 'true');
    if (params?.minPrice !== undefined) query.set('min_price', params.minPrice.toString());
    if (params?.maxPrice !== undefined) query.set('max_price', params.maxPrice.toString());
    if (params?.freeOnly) query.set('free_only', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const queryString = query.toString();
    const response = await apiRequest<PaginatedResponse<Product>>(
      `products${queryString ? `?${queryString}` : ''}`, 
      { requiresAuth: false }
    );
    
    return {
      data: response.products,
      pagination: response.pagination,
    };
  },
  
  getById: async (id: number, asAdmin?: boolean): Promise<Product> => {
    if (asAdmin) {
      const response = await apiRequest<{ product: Product }>(`products/${id}`);
      return response.product;
    }
    const response = await apiRequest<{ product: Product }>(`products/${id}`, { requiresAuth: false, includeUserId: true });
    return response.product;
  },
  
  create: (data: Omit<Partial<Product>, 'screenshots' | 'videos' | 'attribute_values' | 'variants'> & { screenshots?: string[]; videos?: { title: string; youtube_url: string }[]; attribute_values?: { attribute_id: number; value: string }[]; variants?: Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at'>[] }) => 
    apiRequest<{ success: boolean; id: number; message: string }>('products', { method: 'POST', body: data }),
  
  update: (id: number, data: Omit<Partial<Product>, 'screenshots' | 'videos' | 'attribute_values' | 'variants'> & { screenshots?: string[]; videos?: { title: string; youtube_url: string }[]; attribute_values?: { attribute_id: number; value: string }[]; variants?: Omit<ProductVariant, 'id' | 'product_id' | 'created_at' | 'updated_at'>[] }) => 
    apiRequest<{ success: boolean; message: string }>(`products/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: number) => 
    apiRequest<{ success: boolean; message: string }>(`products/${id}`, { method: 'DELETE' }),
};

/** @deprecated Use productsApi instead */
export const appsApi = productsApi;


export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiRequest<{ success: boolean; token: string; user: { id: number; username: string; roles?: string[] } }>(
      'auth/login',
      { method: 'POST', body: { username, password }, requiresAuth: false }
    );
    
    if (response.success) {
      localStorage.setItem('admin_api_key', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
      localStorage.setItem('admin_roles', JSON.stringify(response.user.roles || []));
      localStorage.setItem('admin_token_time', Date.now().toString());
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
    localStorage.removeItem('admin_roles');
    localStorage.removeItem('admin_token_time');
  },
  
  isAuthenticated: () => {
    const token = localStorage.getItem('admin_api_key');
    if (!token) return false;
    const tokenTime = localStorage.getItem('admin_token_time');
    if (tokenTime) {
      const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - Number(tokenTime) > ONE_MONTH_MS) {
        // Token expired — auto logout
        localStorage.removeItem('admin_api_key');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_roles');
        localStorage.removeItem('admin_token_time');
        return false;
      }
    }
    return true;
  },
  
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
  address?: string;
  created_at: string;
  updated_at: string;
  paid_orders_count?: number;
}

export interface OrderAttachment {
  id: number;
  order_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  created_at: string;
}

export interface OrderPayment {
  id: number;
  order_id: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paid_at: string;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  user_id: number;
  product_id: number;
  product_name: string;
  serial_number?: string;
  amount: number;
  original_price?: string;
  item_discount?: string;
  item_discount_type?: string;
  sale_discount?: string;
  sale_discount_type?: string;
  delivery_fee?: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';
  bakong_transaction_id?: string;
  payment_md5?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
  notes?: string;
  warranty_period?: string;
  attachments?: OrderAttachment[];
  payments?: OrderPayment[];
  items?: SaleItemRecord[];
  user?: {
    id: number;
    email: string;
    full_name?: string;
    phone?: string;
    address?: string;
  };
  customer?: {
    id: number;
    email?: string;
    full_name?: string;
    phone?: string;
    address?: string;
  };
}

export interface SaleItemRecord {
  id: number;
  sale_id: string;
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  discount: string;
  discount_type?: string | null;
  serial_numbers?: string | null;
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
    return apiRequest(`admin/customers${queryString ? `?${queryString}` : ''}`);
  },
  
  getById: async (id: number): Promise<{ user: AdminUser; orders: AdminOrder[] }> => {
    return apiRequest(`admin/customers/${id}`);
  },
  
  getOrders: async (userId: number): Promise<{ user: { id: number; email: string; full_name?: string }; orders: AdminOrder[] }> => {
    return apiRequest(`admin/customers/${userId}/orders`);
  },
  
  grantProduct: async (userId: number, data: { product_id: number; product_name: string; amount?: number }): Promise<{ success: boolean; message: string; order: AdminOrder }> => {
    return apiRequest(`admin/customers/${userId}/grant-product`, { method: 'POST', body: data });
  },
  
  revokeProduct: async (userId: number, productId: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/customers/${userId}/revoke-product/${productId}`, { method: 'DELETE' });
  },
  
  getAllOrders: async (params?: { status?: string; user_id?: number; search?: string; page?: number; limit?: number }): Promise<{
    orders: AdminOrder[];
    pagination: { current_page: number; total_pages: number; total: number; per_page: number }
  }> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.user_id) query.set('user_id', params.user_id.toString());
    if (params?.search) query.set('search', params.search);
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

  getOrderDetail: async (orderId: string): Promise<{ order: AdminOrder }> => {
    return apiRequest(`admin/orders/${orderId}`);
  },

  updateOrder: async (orderId: string, data: Partial<AdminOrder>): Promise<{ success: boolean; message: string; order: AdminOrder }> => {
    return apiRequest(`admin/orders/${orderId}`, { method: 'PUT', body: data });
  },

  createCustomer: async (data: { email?: string; full_name?: string; phone?: string; address?: string }): Promise<{ success: boolean; user: AdminUser }> => {
    return apiRequest('admin/customers', { method: 'POST', body: data });
  },

  updateCustomer: async (id: number, data: { email?: string; full_name?: string; phone?: string; address?: string }): Promise<{ success: boolean; user: AdminUser }> => {
    return apiRequest(`admin/customers/${id}`, { method: 'PUT', body: data });
  },

  deleteCustomer: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/customers/${id}`, { method: 'DELETE' });
  },

  uploadAttachment: async (orderId: string, file: File): Promise<{ success: boolean; attachment: OrderAttachment }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getApiKey() || getUserAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  deleteAttachment: async (orderId: string, attachmentId: number): Promise<{ success: boolean }> => {
    return apiRequest(`admin/orders/${orderId}/attachments/${attachmentId}`, { method: 'DELETE' });
  },

  addPayment: async (orderId: string, data: { amount: number; method: string; reference?: string; note?: string; paid_at?: string }): Promise<{ success: boolean; payment: OrderPayment }> => {
    return apiRequest(`admin/orders/${orderId}/payments`, { method: 'POST', body: data });
  },

  deletePayment: async (orderId: string, paymentId: number): Promise<{ success: boolean }> => {
    return apiRequest(`admin/orders/${orderId}/payments/${paymentId}`, { method: 'DELETE' });
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
    top_products: { product_id: number; product_name: string; revenue: number; sales: number }[];
  }> => {
    const params = new URLSearchParams();
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60;
      const sign = offsetHours >= 0 ? '+' : '-';
      params.set('tz_offset', `${sign}${String(Math.abs(Math.floor(offsetHours))).padStart(2, '0')}:${String(Math.abs(offsetMinutes) % 60).padStart(2, '0')}`);
    } else {
      params.set('days', String(days));
    }
    return apiRequest(`admin/analytics?${params.toString()}`);
  },

  profitAnalysis: async (search = '', sortBy = 'profit', sortDir = 'desc'): Promise<{
    products: any[];
    summary: { total_cost: number; total_revenue: number; total_profit: number; overall_margin: number; product_count: number };
  }> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    return apiRequest(`admin/analytics/profit?${params.toString()}`);
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

// Admin Users (staff) for role assignment
export interface AdminStaffUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

// Staff Users API (admin/staff accounts)
export const staffUsersApi = {
  getAll: async (search?: string): Promise<{ users: { id: number; username: string; roles: string[]; created_at: string }[] }> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`admin/staff-users${params}`);
  },
  create: async (data: { username: string; password: string; roles?: string[] }): Promise<{ success: boolean; user: any }> => {
    return apiRequest('admin/staff-users', { method: 'POST', body: data });
  },
  update: async (id: number, data: { username?: string; password?: string; roles?: string[] }): Promise<{ success: boolean; user: any }> => {
    return apiRequest(`admin/staff-users/${id}`, { method: 'PUT', body: data });
  },
  delete: async (id: number): Promise<{ success: boolean }> => {
    return apiRequest(`admin/staff-users/${id}`, { method: 'DELETE' });
  },
};

// Roles API
export const rolesApi = {
  getAll: async (): Promise<{ users: UserWithRoles[] }> => {
    return apiRequest('admin/roles');
  },

  listUsers: async (): Promise<{ users: AdminStaffUser[] }> => {
    return apiRequest('admin/roles/users');
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
  
  trackDownload: async (productId: number, productName: string, version?: string): Promise<{ success: boolean }> => {
    return apiRequest('track-download', { 
      method: 'POST', 
      body: { product_id: productId, product_name: productName, version } 
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

// Product Submission Types
export interface ProductSubmission {
  id: number;
  product_id: number;
  version: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  submitted_by: number;
  reviewed_by: number | null;
  review_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  product?: { id: number; name: string; icon_url?: string };
  submittedBy?: { id: number; email: string; full_name?: string };
}

/** @deprecated Use ProductSubmission instead */
export type AppSubmission = ProductSubmission;

// Product Submissions API
export const submissionsApi = {
  getAll: async (status?: string): Promise<{
    submissions: ProductSubmission[];
    stats: { pending: number; approved: number; rejected: number; suspended: number };
  }> => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return apiRequest(`admin/submissions${query}`);
  },
  
  update: async (id: number, data: { status: string; review_notes?: string; rejection_reason?: string }): Promise<{ success: boolean; submission: ProductSubmission }> => {
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

// ─── Product Serials Types ────────────────────────────────────────────────────
export interface ProductSerial {
  id: number;
  product_id: number;
  variant_id?: number;
  serial_number: string;
  barcode: string;
  status: 'available' | 'sold' | 'reserved' | 'defective';
  sale_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  product?: { id: number; name: string; icon_url?: string };
  variant?: { id: number; combination: Record<string, string>; sku?: string; price_adjustment: number };
}

export interface SerialLookupResult {
  found: boolean;
  status?: string;
  message?: string;
  serial?: ProductSerial;
  product?: SaleProduct;
}

// Product Serials API
export const serialsApi = {
  getAll: async (params?: { product_id?: number; status?: string; search?: string; page?: number; limit?: number }): Promise<{
    serials: ProductSerial[];
    pagination: { current_page: number; total_pages: number; total: number; per_page: number };
  }> => {
    const query = new URLSearchParams();
    if (params?.product_id) query.set('product_id', params.product_id.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return apiRequest(`admin/serials?${query.toString()}`);
  },

  add: async (data: { product_id: number; variant_id?: number; serials: { serial_number: string; notes?: string }[] }): Promise<{
    success: boolean; message: string; created: ProductSerial[]; duplicates: string[];
  }> => {
    return apiRequest('admin/serials', { method: 'POST', body: data });
  },

  update: async (id: number, data: Partial<ProductSerial>): Promise<{ success: boolean; serial: ProductSerial }> => {
    return apiRequest(`admin/serials/${id}`, { method: 'PUT', body: data });
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    return apiRequest(`admin/serials/${id}`, { method: 'DELETE' });
  },

  lookup: async (code: string): Promise<SerialLookupResult> => {
    return apiRequest('admin/serials/lookup', { method: 'POST', body: { code } });
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

// Suppliers API
export const suppliersApi = {
  getAll: async (q?: string): Promise<{ suppliers: Supplier[] }> =>
    apiRequest(q ? `admin/suppliers?q=${encodeURIComponent(q)}` : 'admin/suppliers'),
  create: async (data: Partial<Supplier>): Promise<{ success: boolean; supplier: Supplier }> =>
    apiRequest('admin/suppliers', { method: 'POST', body: data }),
  update: async (id: number, data: Partial<Supplier>): Promise<{ success: boolean; supplier: Supplier }> =>
    apiRequest(`admin/suppliers/${id}`, { method: 'PUT', body: data }),
  delete: async (id: number): Promise<{ success: boolean }> =>
    apiRequest(`admin/suppliers/${id}`, { method: 'DELETE' }),
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

// Sales Module Types
export interface SalesDashboardStats {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  total_revenue: number;
  avg_order_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
}

export interface StockProduct {
  id: number;
  name: string;
  icon_url?: string;
  category?: string;
  brand?: string;
  variants: {
    id: number;
    combination: Record<string, string>;
    sku?: string;
    stock_quantity: number;
    price_adjustment: number;
    purchase_price?: number;
    is_active: boolean;
  }[];
}

export interface SaleCustomer {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
}

export interface SaleProduct {
  id: number;
  name: string;
  icon_url?: string;
  variants: {
    id: number;
    combination: Record<string, string>;
    sku?: string;
    stock_quantity: number;
    price_adjustment: number;
    purchase_price?: number;
    is_active: boolean;
  }[];
}

export interface CreateSalePayload {
  customer_type: 'existing' | 'new';
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  items: { product_id: number; variant_id?: number; quantity: number; price: number; discount?: number; discount_type?: 'amount' | 'percent'; serial_numbers?: string[] }[];
  payment_status: 'paid' | 'pending' | 'partial' | 'unpaid';
  sale_discount?: number;
  sale_discount_type?: 'amount' | 'percent';
  delivery_fee?: number;
  paid_amount?: number;
  paid_method?: string;
  notes?: string;
  warranty_period?: string;
  sale_date?: string;
}

// Sales API
export const salesApi = {
  getDashboard: async (days?: number, from?: string, to?: string): Promise<{
    stats: SalesDashboardStats;
    revenue_by_date: { date: string; revenue: number; orders: number }[];
    top_products: { product_id: number; product_name: string; revenue: number; sales: number }[];
    recent_sales: AdminOrder[];
  }> => {
    const params = new URLSearchParams();
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
    } else if (days) {
      params.set('days', days.toString());
    }
    return apiRequest(`admin/sales/dashboard?${params.toString()}`);
  },

  getStockOverview: async (params?: { stock_status?: string; search?: string; category_id?: number; page?: number; limit?: number }): Promise<{
    products: StockProduct[];
    pagination: { current_page: number; total_pages: number; total: number; per_page: number };
  }> => {
    const query = new URLSearchParams();
    if (params?.stock_status) query.set('stock_status', params.stock_status);
    if (params?.search) query.set('search', params.search);
    if (params?.category_id) query.set('category_id', params.category_id.toString());
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return apiRequest(`admin/sales/stock?${query.toString()}`);
  },

  updateStock: async (productId: number, data: { variant_id?: number; stock_quantity: number; reason?: string }): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`admin/sales/stock/${productId}`, { method: 'PUT', body: data });
  },

  bulkUpdateStock: async (updates: { product_id: number; variant_id?: number; stock_quantity: number }[]): Promise<{ success: boolean; message: string; updated_count: number }> => {
    return apiRequest('admin/sales/stock/bulk', { method: 'POST', body: { updates } });
  },

  searchCustomers: async (q: string): Promise<{ customers: SaleCustomer[] }> => {
    return apiRequest(`admin/sales/customers?q=${encodeURIComponent(q)}`);
  },

  searchProducts: async (q: string): Promise<{ products: SaleProduct[] }> => {
    return apiRequest(`admin/sales/products?q=${encodeURIComponent(q)}`);
  },

  createSale: async (data: CreateSalePayload): Promise<{ success: boolean; message: string; total_amount: number }> => {
    return apiRequest('admin/sales/create', { method: 'POST', body: data });
  },
};

// ─── Reports API ──────────────────────────────────────────────────────────────
export const reportsApi = {
  productSales: async (from: string, to: string): Promise<{
    monthly: { product_id: number; product_name: string; month: string; quantity: number; revenue: number }[];
    summary: { product_id: number; product_name: string; icon_url?: string; total_quantity: number; total_revenue: number; avg_price: number }[];
    period: { from: string; to: string };
  }> => {
    return apiRequest(`admin/reports/product-sales?from=${from}&to=${to}`);
  },

  revenueTrend: async (from: string, to: string, groupBy = 'monthly'): Promise<{
    trend: { period: string; orders: number; revenue: number; avg_order_value: number }[];
    totals: { total_orders: number; total_revenue: number; avg_order_value: number };
    period: { from: string; to: string; group_by: string };
  }> => {
    return apiRequest(`admin/reports/revenue-trend?from=${from}&to=${to}&group_by=${groupBy}`);
  },

  profitByPeriod: async (from: string, to: string): Promise<{
    products: { product_id: number; product_name: string; icon_url?: string; total_sold: number; total_revenue: number; cost_of_goods: number; profit: number; margin: number }[];
    summary: { total_revenue: number; total_cost: number; total_profit: number; overall_margin: number };
    period: { from: string; to: string };
  }> => {
    return apiRequest(`admin/reports/profit-by-period?from=${from}&to=${to}`);
  },

  customerReport: async (from: string, to: string): Promise<{
    customers: { user_id: number; full_name: string; email: string; phone?: string; total_orders: number; total_spent: number; avg_order_value: number; first_purchase: string; last_purchase: string; unique_products: number }[];
    stats: { total_customers: number; repeat_customers: number; repeat_rate: number };
    period: { from: string; to: string };
  }> => {
    return apiRequest(`admin/reports/customer-report?from=${from}&to=${to}`);
  },
};

// ─── Purchase Types ───────────────────────────────────────────────────────────
export interface PurchaseItem {
  id?: number;
  purchase_id?: string;
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_label?: string | null;
  quantity: number;
  received_quantity?: number;
  unit_cost: number;
  total_cost?: number;
}

export interface PurchasePayment {
  id: number;
  purchase_id: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paid_at: string;
  created_at: string;
}

export interface PurchaseExpense {
  id: number;
  purchase_id: string;
  category: string;
  description?: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  reference_number: string;
  supplier_name: string;
  status: 'draft' | 'ordered' | 'partial' | 'received' | 'completed' | 'cancelled';
  total_amount: number;
  delivery_fee: number;
  other_expense: number;
  other_expense_note?: string;
  grand_total: number;
  paid_amount: number;
  currency: string;
  notes?: string;
  tracking_number?: string;
  carrier?: string;
  ordered_at?: string;
  received_at?: string;
  completed_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  items: PurchaseItem[];
  payments: PurchasePayment[];
  expenses: PurchaseExpense[];
  receive_logs?: PurchaseReceiveLog[];
}

export interface PurchaseReceiveLog {
  id: number;
  purchase_id: string;
  purchase_item_id: number;
  product_name: string;
  variant_label?: string;
  quantity_received: number;
  previous_received: number;
  new_total_received: number;
  received_by?: number;
  received_at: string;
  created_at: string;
}

export interface PurchaseDashboardStats {
  total_purchases: number;
  pending_purchases: number;
  total_spent: number;
  total_paid: number;
  total_owed: number;
}

export const purchasesApi = {
  dashboard: async (): Promise<{ success: boolean; stats: PurchaseDashboardStats }> => {
    return apiRequest('admin/purchases/dashboard');
  },

  getAll: async (page = 1, limit = 20, status = 'all', search = ''): Promise<{ purchases: Purchase[]; pagination: { current_page: number; total_pages: number; total: number; per_page: number } }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    return apiRequest(`admin/purchases?${params}`);
  },

  getById: async (id: string): Promise<{ purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}`);
  },

  create: async (data: { supplier_id: number; status?: string; notes?: string; delivery_fee?: number; other_expense?: number; other_expense_note?: string; items: Omit<PurchaseItem, 'id' | 'purchase_id' | 'received_quantity' | 'total_cost'>[] }): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest('admin/purchases', { method: 'POST', body: data });
  },

  update: async (id: string, data: { supplier_id?: number; notes?: string; delivery_fee?: number; other_expense?: number; other_expense_note?: string; items?: Omit<PurchaseItem, 'id' | 'purchase_id' | 'received_quantity' | 'total_cost'>[] }): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}`, { method: 'PUT', body: data });
  },

  updateStatus: async (id: string, status: string): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/status`, { method: 'PUT', body: { status } });
  },

  receiveItems: async (id: string, items: { item_id: number; received_quantity: number }[]): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/receive-items`, { method: 'POST', body: { items } });
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest(`admin/purchases/${id}`, { method: 'DELETE' });
  },

  addPayment: async (id: string, data: { amount: number; method?: string; reference?: string; note?: string }): Promise<{ success: boolean; payment: PurchasePayment; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/payments`, { method: 'POST', body: data });
  },

  deletePayment: async (id: string, paymentId: number): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/payments/${paymentId}`, { method: 'DELETE' });
  },

  addExpense: async (id: string, data: { category: string; description?: string; amount: number }): Promise<{ success: boolean; expense: PurchaseExpense; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/expenses`, { method: 'POST', body: data });
  },

  deleteExpense: async (id: string, expenseId: number): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/expenses/${expenseId}`, { method: 'DELETE' });
  },

  deleteReceiveLog: async (id: string, logId: number): Promise<{ success: boolean; purchase: Purchase }> => {
    return apiRequest(`admin/purchases/${id}/receive-logs/${logId}`, { method: 'DELETE' });
  },
};

// ─── Warranty Types & API ──────────────────────────────────────────────────────
export interface WarrantyOption {
  id: number;
  name: string;
  duration_days: number;
  policy: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const warrantyApi = {
  getAll: async (): Promise<{ warranties: WarrantyOption[] }> => {
    return apiRequest('admin/warranties');
  },

  create: async (data: { name: string; duration_days: number; policy?: string; is_default?: boolean }): Promise<{ warranty: WarrantyOption }> => {
    return apiRequest('admin/warranties', { method: 'POST', body: data });
  },

  update: async (id: number, data: { name: string; duration_days: number; policy?: string; is_default?: boolean }): Promise<{ warranty: WarrantyOption }> => {
    return apiRequest(`admin/warranties/${id}`, { method: 'PUT', body: data });
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    return apiRequest(`admin/warranties/${id}`, { method: 'DELETE' });
  },
};

// Slider Types
export interface Slider {
  id: number;
  title?: string;
  title_km?: string;
  subtitle?: string;
  subtitle_km?: string;
  badge?: string;
  badge_km?: string;
  image_url: string;
  link_url?: string;
  accent_color: string;
  gradient: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Sliders API
export const slidersApi = {
  // Public
  getActive: async (): Promise<{ sliders: Slider[] }> => {
    return apiRequest('sliders', { requiresAuth: false });
  },

  // Admin
  getAll: async (): Promise<{ sliders: Slider[] }> => {
    return apiRequest('admin/sliders');
  },

  create: async (data: Partial<Slider>): Promise<{ success: boolean; slider: Slider }> => {
    return apiRequest('admin/sliders', { method: 'POST', body: data });
  },

  update: async (id: number, data: Partial<Slider>): Promise<{ success: boolean; slider: Slider }> => {
    return apiRequest(`admin/sliders/${id}`, { method: 'PUT', body: data });
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    return apiRequest(`admin/sliders/${id}`, { method: 'DELETE' });
  },

  reorder: async (order: number[]): Promise<{ success: boolean }> => {
    return apiRequest('admin/sliders/reorder', { method: 'POST', body: { order } });
  },
};
