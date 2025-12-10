import * as React from "react";

export function Accordion({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "space-y-2 " + (className || "");
  return <div className={classes} {...props} />;
}

export function AccordionItem({
  className,
  ...props
}: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  const classes = "border border-slate-200 rounded-md bg-white " + (className || "");
  return <details className={classes} {...props} />;
}

export function AccordionTrigger({
  children,
  ...props
}: React.HTMLAttributes<HTMLSummaryElement>) {
  const classes =
    "list-none cursor-pointer select-none px-4 py-2 text-sm font-medium text-slate-800 flex items-center justify-between";
  return <summary className={classes} {...props}>{children}</summary>;
}

export function AccordionContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "px-4 py-3 border-t border-slate-200 " + (className || "");
  return <div className={classes} {...props} />;
}
