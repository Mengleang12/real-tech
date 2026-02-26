-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create app_status enum
CREATE TYPE public.app_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'suspended');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action text NOT NULL,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity logs
CREATE POLICY "Admins can view all activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create user_status table for ban/suspend functionality
CREATE TABLE public.user_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    reason text,
    suspended_until timestamp with time zone,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_status
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_status
CREATE POLICY "Admins can view all user statuses" 
ON public.user_status 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user statuses" 
ON public.user_status 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    title_km text,
    message text NOT NULL,
    message_km text,
    type text NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'update', 'promotion', 'system')),
    target_users text NOT NULL DEFAULT 'all' CHECK (target_users IN ('all', 'admins', 'specific')),
    specific_user_ids uuid[],
    is_read_by uuid[] DEFAULT '{}',
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Anyone can read published notifications" 
ON public.notifications 
FOR SELECT 
USING (
    published_at IS NOT NULL 
    AND published_at <= now() 
    AND (expires_at IS NULL OR expires_at > now())
    AND (target_users = 'all' OR target_users = 'admins' AND public.has_role(auth.uid(), 'admin') OR auth.uid() = ANY(specific_user_ids))
);

CREATE POLICY "Admins can manage notifications" 
ON public.notifications 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create app_submissions table for review system
CREATE TABLE public.app_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id integer NOT NULL,
    version text NOT NULL,
    status app_status NOT NULL DEFAULT 'pending_review',
    submitted_by uuid NOT NULL,
    reviewed_by uuid,
    review_notes text,
    rejection_reason text,
    submitted_at timestamp with time zone NOT NULL DEFAULT now(),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on app_submissions
ALTER TABLE public.app_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_submissions
CREATE POLICY "Admins can view all submissions" 
ON public.app_submissions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage submissions" 
ON public.app_submissions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create analytics_daily table for dashboard stats
CREATE TABLE public.analytics_daily (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    total_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    total_orders integer DEFAULT 0,
    paid_orders integer DEFAULT 0,
    total_revenue numeric DEFAULT 0,
    total_downloads integer DEFAULT 0,
    active_users integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on analytics_daily
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics
CREATE POLICY "Admins can view analytics" 
ON public.analytics_daily 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage analytics" 
ON public.analytics_daily 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_submissions_updated_at
BEFORE UPDATE ON public.app_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at
BEFORE UPDATE ON public.analytics_daily
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policy for admins to view all orders
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to update orders
CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));