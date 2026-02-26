-- Fix overly permissive RLS policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role can insert logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Service role can manage analytics" ON public.analytics_daily;
DROP POLICY IF EXISTS "Service role can manage payment logs" ON public.payment_logs;

-- Create proper policies for user_activity_logs (only authenticated users can insert their own logs)
CREATE POLICY "Users can insert their own activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create proper policies for analytics_daily (only admins can insert/update)
CREATE POLICY "Admins can manage analytics" 
ON public.analytics_daily 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix payment_logs policy - only admins can manage
DROP POLICY IF EXISTS "Service role can manage payment logs" ON public.payment_logs;
CREATE POLICY "Admins can manage payment logs" 
ON public.payment_logs 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));