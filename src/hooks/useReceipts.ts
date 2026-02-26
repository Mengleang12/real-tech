import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, getAuthHeader } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

export interface Receipt {
  id: string;
  order_id: string;
  user_id: number;
  receipt_number: string;
  app_id: number;
  app_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  user_email: string;
  user_name?: string;
  paid_at: string;
  email_sent: boolean;
  email_sent_at?: string;
  download_links?: string[];
  created_at: string;
}

export const useReceipts = () => {
  const { user, token } = useAuth();

  return useQuery({
    queryKey: ['receipts', user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/receipts`, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeader(),
        },
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to fetch receipts');
      }
      
      return data.receipts as Receipt[];
    },
    enabled: !!user && !!token,
  });
};

export const useReceipt = (receiptId: string) => {
  const { user, token } = useAuth();

  return useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/receipts/${receiptId}`, {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeader(),
        },
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to fetch receipt');
      }
      
      return data.receipt as Receipt;
    },
    enabled: !!user && !!token && !!receiptId,
  });
};

export const useResendReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/receipts/${receiptId}/resend`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...getAuthHeader(),
        },
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to resend receipt');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};
