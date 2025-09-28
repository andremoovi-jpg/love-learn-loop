import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, BookOpen, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  product_type: string;
  total_modules: number;
  estimated_duration?: string;
  level?: string;
  progress?: number;
}

interface ProductCardProps {
  product: Product;
  className?: string;
  showProgress?: boolean;
}

const productTypeColors = {
  course: "bg-primary text-primary-foreground",
  ebook: "bg-secondary text-secondary-foreground",
  mentoring: "bg-success text-success-foreground",
  default: "bg-muted text-muted-foreground",
};

const productTypeLabels = {
  course: "Curso",
  ebook: "E-book",
  mentoring: "Mentoria",
  default: "Produto",
};

export function ProductCard({ product, className, showProgress = false }: ProductCardProps) {
  const progress = product.progress || 0;
  const typeColor = productTypeColors[product.product_type as keyof typeof productTypeColors] || productTypeColors.default;
  const typeLabel = productTypeLabels[product.product_type as keyof typeof productTypeLabels] || productTypeLabels.default;

  return (
    <Card className={cn(
      "group overflow-hidden transition-base hover:shadow-medium hover:-translate-y-1",
      className
    )}>
      {/* Cover Image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-base group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-primary">
            <BookOpen className="h-12 w-12 text-primary-foreground/50" />
          </div>
        )}
        
        {/* Product Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={typeColor}>
            {typeLabel}
          </Badge>
        </div>

        {/* Level Badge */}
        {product.level && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-background/80 text-foreground">
              {product.level}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight text-foreground group-hover:text-primary transition-base">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Meta Information */}
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <BookOpen className="h-3 w-3" />
            <span>{product.total_modules} módulos</span>
          </div>
          
          {product.estimated_duration && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{product.estimated_duration}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Progresso</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action Button */}
        <Button asChild className="w-full gradient-primary border-0 shadow-soft hover:shadow-medium">
          <Link to={`/produto/${product.slug}`}>
            <Play className="mr-2 h-4 w-4" />
            {progress > 0 ? "Continuar" : "Acessar"}
          </Link>
        </Button>
      </div>
    </Card>
  );
}