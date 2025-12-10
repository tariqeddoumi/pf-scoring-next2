import * as React from "react";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  const classes = "w-full border-collapse text-sm " + (className || "");
  return <table className={classes} {...props} />;
}

export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  const classes = "border-b border-slate-200 px-2 py-1 text-left font-semibold " + (className || "");
  return <th className={classes} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const classes = "border-b border-slate-100 px-2 py-1 " + (className || "");
  return <td className={classes} {...props} />;
}
