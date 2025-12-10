import * as React from "react";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const classes = "text-xs font-medium text-slate-700 " + (className || "");
  return <label className={classes} {...props} />;
}
