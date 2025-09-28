import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  gradient?: boolean;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className,
  gradient = false 
}: StatCardProps) {
  return (
    <Card className={cn(
      "p-6 transition-base hover:shadow-medium",
      gradient && "gradient-primary text-primary-foreground",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            gradient ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <p className={cn(
              "text-3xl font-bold tracking-tight",
              gradient ? "text-primary-foreground" : "text-foreground"
            )}>
              {value}
            </p>
            {trend && (
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive
                  ? gradient ? "text-primary-foreground/90" : "text-success"
                  : gradient ? "text-primary-foreground/90" : "text-danger"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          gradient 
            ? "bg-primary-foreground/10 text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}