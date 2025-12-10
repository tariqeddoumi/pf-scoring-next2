import * as React from "react";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes =
    "rounded-lg border border-slate-200 bg-white shadow-sm " +
    (className || "");
  return <div className={classes} {...props} />;
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "border-b border-slate-100 px-4 py-3 " + (className || "");
  return <div className={classes} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const classes = "text-sm font-semibold text-slate-900 " + (className || "");
  return <h3 className={classes} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "px-4 py-3 " + (className || "");
  return <div className={classes} {...props} />;
}
