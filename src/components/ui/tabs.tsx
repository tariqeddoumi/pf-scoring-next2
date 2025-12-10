import * as React from "react";

type TabsContextType = {
  value?: string;
  setValue?: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextType>({});

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(value);
  const val = value ?? internalValue;

  const setValue = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: val, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = "inline-flex rounded-md border border-slate-200 bg-slate-50 p-1 " + (className || "");
  return <div className={classes} {...props} />;
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  const active = ctx.value === value;
  const classes =
    "px-3 py-1 text-xs rounded-md cursor-pointer " +
    (active ? "bg-white text-slate-900 border border-slate-300" : "text-slate-500");

  return (
    <button
      type="button"
      className={classes}
      onClick={() => ctx.setValue && ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className="mt-3">{children}</div>;
}
