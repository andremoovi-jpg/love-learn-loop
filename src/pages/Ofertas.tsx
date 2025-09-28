import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { UpsellCard } from "@/components/ui/upsell-card";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingBag } from "lucide-react";

interface Upsell {
  id: string;
  title: string;
  description: string;
  price: number;
  discount_percentage: number;
  cartpanda_checkout_url: string;
  upsell_product: {
    name: string;
    cover_image_url: string;
    product_type: string;
  };
  parent_product: {
    name: string;
  };
}

export default function Ofertas() {
  const { user } = useAuth();
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAvailableUpsells();
    }
  }, [user]);

  const fetchAvailableUpsells = async () => {
    try {
      // Get user's owned products
      const { data: ownedProducts } = await supabase
        .from('user_products')
        .select('product_id')
        .eq('user_id', user!.id);

      if (!ownedProducts || ownedProducts.length === 0) {
        setLoading(false);
        return;
      }

      const ownedIds = ownedProducts.map(p => p.product_id);

      // Get upsells for owned products that user doesn't already own
      const { data: availableUpsells, error } = await supabase
        .from('upsells')
        .select(`
          *,
          parent_product:products!parent_product_id(name),
          upsell_product:products!upsell_product_id(name, cover_image_url, product_type)
        `)
        .in('parent_product_id', ownedIds)
        .not('upsell_product_id', 'in', `(${ownedIds.join(',')})`)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching upsells:', error);
      } else {
        setUpsells(availableUpsells || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar 
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Ofertas" }
            ]}
          />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Ofertas" }
          ]}
        />

        <main className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Ofertas Exclusivas</h1>
                <p className="text-muted-foreground">
                  Produtos selecionados especialmente para você
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          {upsells.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Você está em dia!</h3>
                  <p className="text-muted-foreground">
                    No momento não há ofertas disponíveis para você. Novas ofertas exclusivas aparecerão aqui em breve.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upsells.map(upsell => (
                <UpsellCard key={upsell.id} upsell={upsell} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}