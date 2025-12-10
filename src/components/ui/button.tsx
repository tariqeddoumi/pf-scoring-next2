import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none";

  const variants: Record<string, string> = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-300 bg-white hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100",
  };

  const sizes: Record<string, string> = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    icon: "h-8 w-8",
  };

  const classes = [
    base,
    variants[variant] || variants.default,
    sizes[size] || sizes.default,
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
}

export default Button;
