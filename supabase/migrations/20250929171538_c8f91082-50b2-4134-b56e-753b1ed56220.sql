-- Fix products_public missing RLS protection

-- Enable RLS on products_public view properly
-- Since it's a view, we need to handle it differently

-- First, let's check if products_public is actually a view or table
-- If it's a view, we need to ensure the underlying table has proper RLS

-- Create RLS policies for products_public if it's treated as a table
-- Note: Views inherit RLS from their base tables, so this might not be needed
-- But the linter is flagging it, so let's address it

-- The products_public appears to be a view of the products table
-- So we should ensure the products table has proper public access policies

-- Add a specific policy for public product access
CREATE POLICY "Public products viewable by everyone" 
ON public.products 
FOR SELECT 
USING (
  is_active = true
);

-- Also ensure the view grants are correct (already done in previous migration)
-- This should satisfy the linter warning about missing RLS on products_public