import * as React from "react";

export function Command({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "text-sm " + (className || "");
  return <div className={classes} {...props} />;
}

export function CommandList(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function CommandGroup({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-2">
      {heading && (
        <div className="mb-1 text-[11px] font-semibold text-slate-500 uppercase">
          {heading}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function CommandItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes =
    "px-2 py-1 rounded-md cursor-pointer hover:bg-slate-100 " +
    (className || "");
  return <div className={classes} {...props} />;
}
