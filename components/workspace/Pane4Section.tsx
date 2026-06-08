"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/primitives";

type Pane4SectionProps = {
  id?: string;
  title: string;
  className?: string;
  children: ReactNode;
};

export function Pane4Section({
  id,
  title,
  className,
  children,
}: Pane4SectionProps) {
  return (
    <section id={id} className={cn("flex flex-col gap-3 px-5 py-4", className)}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  );
}
