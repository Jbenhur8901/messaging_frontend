import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-primary/90 active:translate-y-px",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-sm)] hover:bg-destructive/90 active:translate-y-px",
        outline:
          "border border-border/80 bg-background text-foreground shadow-[var(--shadow-xs)] hover:border-primary/40 hover:bg-accent/60",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-xs)] hover:bg-secondary/80",
        ghost: "text-foreground/80 hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-[linear-gradient(135deg,#E0D112,#c4b810)] text-black shadow-[var(--shadow-md)] hover:brightness-110",
        soft:
          "bg-primary/10 text-primary hover:bg-primary/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
