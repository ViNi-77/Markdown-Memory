"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { type Department } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";

type PositionPaneProps = {
  workspaceName: string;
  departments: Department[];
  selectedPositionName?: string;
  onAddPosition: (deptId: string, posName: string) => void;
  onDeletePosition: (deptId: string, posId: string) => void;
};

export function PositionPane({
  workspaceName,
  departments,
  selectedPositionName,
  onAddPosition,
  onDeletePosition,
}: PositionPaneProps) {
  const [addDialogDeptId, setAddDialogDeptId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    deptId: string;
    posId: string;
    posName: string;
  } | null>(null);

  const addDialogDept = departments.find((d) => d.id === addDialogDeptId);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
      >
        <SidebarHeader className="border-b border-sidebar-border p-0">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {workspaceName}
            </h2>
            <Pane1Toggle />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
          {departments.map((dept) => (
            <SidebarGroup key={dept.id} className="px-1">
              <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
                {dept.name}
              </SidebarGroupLabel>
              <SidebarGroupAction
                title={`${dept.name} にポジションを追加`}
                onClick={() => setAddDialogDeptId(dept.id)}
                className="w-6 rounded-[min(var(--radius-md),10px)] text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-3"
              >
                <Plus />
                <span className="sr-only">{dept.name} にポジションを追加</span>
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {dept.positions.map((pos) => {
                    const active = pos.name === selectedPositionName;
                    return (
                      <SidebarMenuItem key={pos.id}>
                        <SidebarMenuButton
                          tooltip={pos.name}
                          isActive={active}
                          aria-current={active ? "page" : undefined}
                        >
                          <span className="truncate">{pos.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {pos.count}
                          </span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <SidebarMenuAction showOnHover>
                                <MoreHorizontal />
                                <span className="sr-only">操作</span>
                              </SidebarMenuAction>
                            }
                          />
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() =>
                                  setDeleteTarget({
                                    deptId: dept.id,
                                    posId: pos.id,
                                    posName: pos.name,
                                  })
                                }
                              >
                                <Trash2 />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {addDialogDept && (
        <AddItemDialog
          open={addDialogDeptId !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogDeptId(null);
          }}
          title="ポジションを追加"
          description={`${addDialogDept.name} に新しいポジションを追加します`}
          fieldLabel="ポジション名"
          fieldId="pos-name"
          placeholder="例: データエンジニア"
          onAdd={(name) => onAddPosition(addDialogDept.id, name)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="ポジションを削除しますか？"
        itemName={deleteTarget?.posName ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeletePosition(deleteTarget.deptId, deleteTarget.posId);
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
