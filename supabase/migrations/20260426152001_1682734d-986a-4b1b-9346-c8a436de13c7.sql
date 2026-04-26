-- Allow admins to delete orders
CREATE POLICY "admins delete orders"
ON public.orders
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete order items (cascade cleanup)
CREATE POLICY "admins delete order items"
ON public.order_items
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));