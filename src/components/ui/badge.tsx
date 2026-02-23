import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/80 focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/95 text-primary-foreground",
        secondary:
          "border-secondary/40 bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/40 bg-destructive text-destructive-foreground",
        outline: "border-border/70 bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
