"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  onConfirm: () => void;
  /** 既定は「『{itemName}』を削除します。この操作は取り消せません。」。
   *  論理削除（アーカイブ）など別文言が必要な呼び出し元のために上書きできる。 */
  description?: string;
  /** 既定は「削除」。アーカイブ等で別ラベルにしたい場合に上書きする。 */
  actionLabel?: string;
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  itemName,
  onConfirm,
  description,
  actionLabel = "削除",
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? `「${itemName}」を削除します。この操作は取り消せません。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
