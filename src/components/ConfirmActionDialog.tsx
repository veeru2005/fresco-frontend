import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

const ConfirmActionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmActionDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl border-2 border-[#255c45] bg-white p-4 sm:p-6 shadow-xl">
        <AlertDialogHeader className="space-y-2 sm:space-y-3 text-center">
          <AlertDialogTitle className="text-2xl leading-tight">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-relaxed">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid w-full grid-cols-2 gap-3 pt-2">
          <AlertDialogCancel className="mt-0 w-full border border-amber-300 bg-amber-400 text-slate-900 hover:bg-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full bg-red-600 text-white hover:bg-red-700 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmActionDialog;
