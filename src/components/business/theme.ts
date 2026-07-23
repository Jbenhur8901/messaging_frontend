/** Shared Tailwind classes for Business modules — aligned with app dark theme tokens */

export const biz = {
  surface: "rounded-[16px] bg-card p-1.5 shadow-lg border border-border",
  card: "rounded-xl border border-border bg-card",
  cardMuted: "rounded-xl border border-border bg-muted/40",
  rowHover: "hover:bg-accent transition-colors",
  rowSelected: "bg-primary/5",
  tabActive: "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(255,204,0,0.35)]",
  tabInactive: "text-muted-foreground hover:bg-accent hover:text-foreground",
  btnPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
  textTitle: "text-foreground",
  textMeta: "text-muted-foreground",
  iconWrap: "bg-primary/10 text-primary",
  inputFocus: "focus:ring-2 focus:ring-primary/20",
  pillActive: "border-primary bg-primary/10 text-primary",
  pillInactive: "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted",
} as const
