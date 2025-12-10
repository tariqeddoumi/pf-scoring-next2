import * as React from "react";

export function Separator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "h-px w-full bg-slate-200 " + (className || "");
  return <div className={classes} {...props} />;
}
