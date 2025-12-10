import * as React from "react";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => onOpenChange && onOpenChange(false)}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "p-4 " + (className || "");
  return <div className={classes} {...props} />;
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "mb-2 " + (className || "");
  return <div className={classes} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const classes = "text-sm font-semibold text-slate-900 " + (className || "");
  return <h3 className={classes} {...props} />;
}
