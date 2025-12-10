import * as React from "react";

export function ScrollArea({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "max-h-64 overflow-auto " + (className || "");
  return <div className={classes} {...props} />;
}
