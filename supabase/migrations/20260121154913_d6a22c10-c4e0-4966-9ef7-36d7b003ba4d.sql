-- Create payment_logs table for ABA PayWay transaction data
CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tran_id TEXT,
  device_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  request_time TEXT NOT NULL,
  qr_string TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  status_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (for backend PHP)
CREATE POLICY "Service role can manage payment logs"
ON public.payment_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_logs_updated_at
BEFORE UPDATE ON public.payment_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_payment_logs_order_id ON public.payment_logs(order_id);
CREATE INDEX idx_payment_logs_tran_id ON public.payment_logs(tran_id);