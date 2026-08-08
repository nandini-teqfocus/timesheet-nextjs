import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-brand-100 text-brand-800 border border-brand-200',
        success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        warning: 'bg-amber-100 text-amber-800 border border-amber-200',
        destructive: 'bg-rose-100 text-rose-800 border border-rose-200',
        outline: 'text-slate-900 border border-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
