import * as React from "react";

type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: "single" | "multiple"; // ignoré, juste pour compat avec l'API shadcn
};

export function Accordion({ className, type, ...props }: AccordionProps) {
  const classes = "space-y-2 " + (className || "");
  return <div className={classes} {...props} />;
}

type AccordionItemProps = React.DetailsHTMLAttributes<HTMLDetailsElement> & {
  value?: string; // ignoré, utilisé seulement comme identifiant logique
};

export function AccordionItem({ className, value, ...props }: AccordionItemProps) {
  const classes =
    "border border-slate-200 rounded-md bg-white " + (className || "");
  return <details className={classes} {...props} />;
}

type AccordionTriggerProps = React.HTMLAttributes<HTMLSummaryElement> & {
  disabled?: boolean;
};

export function AccordionTrigger({
  children,
  disabled,
  ...props
}: AccordionTriggerProps) {
  const classes =
    "list-none cursor-pointer select-none px-4 py-2 text-sm font-medium text-slate-800 flex items-center justify-between " +
    (disabled ? "opacity-60 cursor-not-allowed" : "");
  return (
    <summary
      className={classes}
      aria-disabled={disabled ? true : undefined}
      {...props}
    >
      {children}
    </summary>
  );
}

export function AccordionContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "px-4 py-3 border-t border-slate-200 " + (className || "");
  return <div className={classes} {...props} />;
}
