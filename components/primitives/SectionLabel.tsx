import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sectionLabelVariants = cva(
  "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
  {
    variants: {
      tone: {
        default: "",
        sidebar: "text-sidebar-foreground/70",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

function SectionLabel({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"h2"> & VariantProps<typeof sectionLabelVariants>) {
  return (
    <h2 className={cn(sectionLabelVariants({ tone }), className)} {...props} />
  );
}

export { SectionLabel, sectionLabelVariants };
