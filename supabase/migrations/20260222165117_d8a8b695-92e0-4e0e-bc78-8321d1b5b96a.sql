-- Allow users to view their own app submissions
CREATE POLICY "Users can view their own submissions"
ON public.app_submissions
FOR SELECT
USING (auth.uid() = submitted_by);