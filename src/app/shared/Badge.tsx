interface BadgeProps {
  children: string;
  tone?: "neutral" | "system" | "user" | "agent" | "llm" | "test" | "error" | "success";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
