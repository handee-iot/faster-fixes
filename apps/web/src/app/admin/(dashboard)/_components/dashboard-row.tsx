type DashboardRowProps = {
  label: string;
  children: React.ReactNode;
};

export function DashboardRow({ label, children }: DashboardRowProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}
