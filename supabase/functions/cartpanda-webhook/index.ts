import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    console.log('📦 CartPanda webhook received');
    const payload = await req.json()
    console.log('🔍 Payload:', JSON.stringify(payload, null, 2));

    // Log webhook received
    const { error: logError } = await supabase.from('webhook_logs').insert({
      event_type: payload.event || 'unknown',
      payload: payload,
      processed: false
    });

    if (logError) {
      console.error('❌ Error logging webhook:', logError);
    }

    let processed = false;
    let errorMessage = null;

    try {
      if (payload.event === 'order.paid') {
        console.log('💳 Processing order.paid event');
        await handleOrderPaid(supabase, payload)
        processed = true;
      } else if (payload.event === 'order.refunded') {
        console.log('💸 Processing order.refunded event');
        await handleOrderRefunded(supabase, payload)
        processed = true;
      } else {
        console.log('❓ Unknown event type:', payload.event);
        errorMessage = `Unknown event type: ${payload.event}`;
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    // Update log status
    await supabase
      .from('webhook_logs')
      .update({ 
        processed: processed,
        error_message: errorMessage 
      })
      .eq('payload', payload);

    return new Response(JSON.stringify({ 
      success: processed,
      message: processed ? 'Webhook processed successfully' : 'Failed to process webhook'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    
    // Try to log the error
    try {
      await supabase.from('webhook_logs').insert({
        event_type: 'error',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
        processed: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (logError) {
      console.error('❌ Error logging webhook error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    })
  }
})

async function handleOrderPaid(supabase: any, payload: any) {
  console.log('🔍 Processing order paid for customer:', payload.customer?.email);

  // 1. Check if user exists in auth.users first
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  let existingAuthUser = authUsers?.users?.find((u: any) => u.email === payload.customer?.email);

  // 2. Get or create profile
  let profile = null;
  if (existingAuthUser) {
    console.log('👤 Found existing auth user:', existingAuthUser.id);
    
    // Get existing profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', existingAuthUser.id)
      .single();

    if (existingProfile) {
      profile = existingProfile;
      console.log('📋 Found existing profile:', profile.id);
    } else {
      // Create profile for existing auth user
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: existingAuthUser.id,
          full_name: payload.customer?.full_name || `${payload.customer?.first_name || ''} ${payload.customer?.last_name || ''}`.trim(),
          phone: payload.customer?.phone,
          total_points: 0
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        throw new Error('Failed to create user profile');
      }

      profile = newProfile;
      console.log('✅ Created new profile:', profile.id);
    }
  } else {
    console.log('🆕 Creating new user via webhook - user should sign up manually');
    // For webhook, we can't create auth users directly
    // We'll create a profile with null user_id and handle it later
    throw new Error('User must sign up first before accessing products');
  }

  // 3. Process each product in the order
  const products = payload.line_items || payload.products || [];
  console.log('📦 Processing', products.length, 'products');

  for (const item of products) {
    const cartpandaProductId = item.product_id || item.cartpanda_product_id;
    
    if (!cartpandaProductId) {
      console.warn('⚠️ No product ID found in item:', item);
      continue;
    }

    console.log('🔍 Looking for product with CartPanda ID:', cartpandaProductId);

    // Find product by cartpanda_product_id
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('cartpanda_product_id', cartpandaProductId.toString())
      .single();

    if (productError || !product) {
      console.warn('⚠️ Product not found for CartPanda ID:', cartpandaProductId);
      continue;
    }

    console.log('✅ Found product:', product.name);

    // Check if user already has access
    const { data: existingAccess } = await supabase
      .from('user_products')
      .select('*')
      .eq('user_id', profile.user_id)
      .eq('product_id', product.id)
      .single();

    if (existingAccess) {
      console.log('ℹ️ User already has access to product:', product.name);
      continue;
    }

    // Grant access to product
    const { error: accessError } = await supabase
      .from('user_products')
      .insert({
        user_id: profile.user_id,
        product_id: product.id,
        cartpanda_order_id: payload.order_id?.toString(),
        purchased_at: new Date().toISOString(),
        progress: 0,
        completed_lessons: []
      });

    if (accessError) {
      console.error('❌ Error granting product access:', accessError);
      continue;
    }

    console.log('✅ Granted access to product:', product.name);

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: profile.user_id,
        title: 'Novo produto disponível!',
        message: `Você tem acesso ao ${product.name}. Comece agora!`,
        type: 'new_product',
        is_read: false
      });

    if (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
    } else {
      console.log('📨 Created notification for product:', product.name);
    }
  }

  console.log('✅ Order processing completed');
}

async function handleOrderRefunded(supabase: any, payload: any) {
  console.log('💸 Processing order refund for order:', payload.order_id);

  const products = payload.line_items || payload.products || [];
  
  for (const item of products) {
    const cartpandaProductId = item.product_id || item.cartpanda_product_id;
    
    if (!cartpandaProductId) continue;

    // Find product
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('cartpanda_product_id', cartpandaProductId.toString())
      .single();

    if (!product) continue;

    // Remove access
    const { error: removeError } = await supabase
      .from('user_products')
      .delete()
      .eq('cartpanda_order_id', payload.order_id?.toString())
      .eq('product_id', product.id);

    if (removeError) {
      console.error('❌ Error removing product access:', removeError);
    } else {
      console.log('✅ Removed access to product:', product.name);
    }
  }

  console.log('✅ Refund processing completed');
}