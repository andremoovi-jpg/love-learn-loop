import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { to, subject, html, from = 'contato@mail.harativendas.site' }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    // Get Mailgun credentials from environment
    const smtpHost = Deno.env.get('MAILGUN_SMTP_HOST');
    const smtpPort = Deno.env.get('MAILGUN_SMTP_PORT');
    const smtpUser = Deno.env.get('MAILGUN_SMTP_USER');
    const smtpPassword = Deno.env.get('MAILGUN_SMTP_PASSWORD');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      throw new Error('Missing SMTP configuration');
    }

    console.log('Sending email via Mailgun SMTP', { to, subject, from });

    // Create SMTP connection using nodemailer-like approach
    const emailData = {
      from,
      to,
      subject,
      html,
    };

    // Use fetch to send email via Mailgun API instead of SMTP for better compatibility
    const mailgunApiKey = smtpPassword; // Using the password as API key
    const mailgunDomain = 'mail.harativendas.site';
    
    const formData = new FormData();
    formData.append('from', emailData.from);
    formData.append('to', emailData.to);
    formData.append('subject', emailData.subject);
    formData.append('html', emailData.html);

    const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailgun API error:', errorText);
      throw new Error(`Failed to send email: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        id: result.id 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);