import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Star } from "lucide-react";

interface UpsellCardProps {
  upsell: {
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
  };
}

export function UpsellCard({ upsell }: UpsellCardProps) {
  const handleBuyUpsell = () => {
    if (upsell.cartpanda_checkout_url) {
      window.open(upsell.cartpanda_checkout_url, '_blank');
    }
  };

  const originalPrice = upsell.discount_percentage > 0 
    ? (upsell.price / (1 - upsell.discount_percentage / 100)) 
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-medium transition-base relative">
      {upsell.discount_percentage > 0 && (
        <Badge className="absolute top-4 right-4 bg-danger text-danger-foreground z-10">
          {upsell.discount_percentage}% OFF
        </Badge>
      )}

      <div className="aspect-video relative overflow-hidden">
        <img
          src={upsell.upsell_product.cover_image_url}
          alt={upsell.upsell_product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4">
          <Badge variant="secondary" className="mb-2">
            {upsell.upsell_product.product_type === 'course' ? 'Curso' : 
             upsell.upsell_product.product_type === 'ebook' ? 'E-book' : 
             'Mentoria'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-2 line-clamp-2">{upsell.title}</h3>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {upsell.description}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-warning fill-current" />
          <span className="text-sm text-muted-foreground">
            Complementa: {upsell.parent_product.name}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-bold text-primary">
            R$ {upsell.price.toFixed(2).replace('.', ',')}
          </span>
          {originalPrice && (
            <span className="text-lg text-muted-foreground line-through">
              R$ {originalPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        <Button 
          onClick={handleBuyUpsell} 
          className="w-full gradient-primary"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Comprar Agora
        </Button>
      </CardContent>
    </Card>
  );
}