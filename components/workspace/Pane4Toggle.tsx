"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Pane4ToggleProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
};

export function Pane4Toggle({ open, onToggle, className }: Pane4ToggleProps) {
  const Icon = open ? PanelRightClose : PanelRightOpen;
  const label = open ? "Pane 4 を閉じる" : "Pane 4 を開く";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label={label}
            className={cn("size-7 text-foreground", className)}
          >
            <Icon />
          </Button>
        }
      />
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
