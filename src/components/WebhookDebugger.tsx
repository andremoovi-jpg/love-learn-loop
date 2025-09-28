import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Send, AlertCircle, CheckCircle } from "lucide-react";

const WebhookDebugger = () => {
  const [webhookUrl, setWebhookUrl] = useState(
    `https://btlfheiohdyltfzxobje.supabase.co/functions/v1/cartpanda-webhook`
  );
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    event: "order.paid",
    order_id: "12345",
    customer: {
      id: 94,
      email: "teste@email.com",
      first_name: "João",
      last_name: "Silva",
      phone: "+5511999999999"
    },
    line_items: [
      {
        product_id: "5981097",
        quantity: 1
      }
    ],
    total_price: 299.90
  }, null, 2));
  
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  const sendTestWebhook = async () => {
    setIsLoading(true);
    setResponse('');
    setStatus(null);

    try {
      const payload = JSON.parse(testPayload);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      setResponse(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: responseData
      }, null, 2));

      setStatus(response.ok ? 'success' : 'error');
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const presetPayloads = {
    orderPaid: {
      event: "order.paid",
      order_id: "12345",
      customer: {
        id: 94,
        email: "teste@email.com",
        first_name: "João",
        last_name: "Silva",
        phone: "+5511999999999"
      },
      line_items: [
        {
          product_id: "5981097",
          quantity: 1
        }
      ],
      total_price: 299.90
    },
    orderRefunded: {
      event: "order.refunded",
      order_id: "12345",
      customer: {
        id: 94,
        email: "teste@email.com",
        first_name: "João",
        last_name: "Silva"
      },
      line_items: [
        {
          product_id: "5981097",
          quantity: 1
        }
      ],
      total_price: 299.90
    }
  };

  const loadPreset = (preset: keyof typeof presetPayloads) => {
    setTestPayload(JSON.stringify(presetPayloads[preset], null, 2));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Webhook Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Webhook URL</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-project.supabase.co/functions/v1/cartpanda-webhook"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Test Payload</label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadPreset('orderPaid')}
                >
                  Order Paid
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadPreset('orderRefunded')}
                >
                  Order Refunded
                </Button>
              </div>
            </div>
            <Textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="font-mono text-sm h-64"
              placeholder="Enter JSON payload here..."
            />
          </div>

          <Button 
            onClick={sendTestWebhook} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test Webhook'}
          </Button>

          {response && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium">Response</h4>
                  {status === 'success' && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  )}
                  {status === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-64">
                  {response}
                </pre>
              </div>
            </>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Como usar:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Configure a URL do seu webhook Supabase</li>
                <li>Escolha um payload de teste ou crie o seu próprio</li>
                <li>Clique em "Send Test Webhook" para testar</li>
                <li>Verifique os logs na página Admin → Webhooks</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookDebugger;