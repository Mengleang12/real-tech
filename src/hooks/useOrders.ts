import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, getAuthHeader } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

export interface Order {
  id: string;
  user_id: number;
  app_id: number;
  app_name: string;
  app_icon_url?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  bakong_transaction_id?: string;
  payment_md5?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
}

export const useOrders = () => {
  const { user, token } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeader(),
        },
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to fetch orders');
      }
      
      return data.orders as Order[];
    },
    enabled: !!user && !!token,
  });
};

export const useHasPurchased = (appId: number) => {
  const { user, token } = useAuth();

  return useQuery({
    queryKey: ['purchased', appId, user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders/purchased?app_id=${appId}`, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeader(),
        },
      });
      
      const data = await response.json();
      if (!response.ok) {
        return false;
      }
      
      return data.purchased === true;
    },
    enabled: !!user && !!token && !!appId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ appId, appName, amount }: { appId: number; appName: string; amount: number }) => {
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          app_id: appId,
          app_name: appName,
          amount,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to create order');
      }

      return data.order as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// Generate KHQR code - Laravel endpoint
export const generateKHQR = async (orderId: string, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/api/payment/generate-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      order_id: orderId,
      amount,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || data.message || 'Failed to generate QR code');
  }

  return data;
};

// Verify payment - Laravel endpoint
export const verifyPayment = async (orderId: string, md5: string) => {
  const response = await fetch(`${API_BASE_URL}/api/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      order_id: orderId,
      md5,
    }),
  });

  const data = await response.json();
  return data;
};

// Manual confirm for testing - Laravel endpoint
export const confirmPaymentManual = async (orderId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/payment/confirm-manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      order_id: orderId,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || data.message || 'Failed to confirm payment');
  }

  return data;
};
