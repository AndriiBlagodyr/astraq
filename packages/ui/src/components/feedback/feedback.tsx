import type { ComponentProps } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

export type FeedbackProps = Omit<ComponentProps<"div">, "title"> & {
  title: string;
  description?: string;
  tone?: "info" | "success" | "warning" | "danger";
};

// Icons pair with color so tone never relies on color alone (WCAG 1.4.1).
const feedbackTone = {
  info: { container: "border-brand/25 bg-brand/8", icon: "text-brand-fg", Icon: Info },
  success: {
    container: "border-positive/25 bg-positive/8",
    icon: "text-positive-fg",
    Icon: CircleCheck,
  },
  warning: {
    container: "border-warning/25 bg-warning/8",
    icon: "text-warning-fg",
    Icon: TriangleAlert,
  },
  danger: {
    container: "border-negative/25 bg-negative/8",
    icon: "text-negative-fg",
    Icon: CircleAlert,
  },
};

export function Feedback({
  title,
  description,
  tone = "info",
  className,
  ...props
}: FeedbackProps) {
  const { container, icon, Icon } = feedbackTone[tone];

  return (
    <div
      data-slot="feedback"
      data-tone={tone}
      className={cn(
        "grid grid-cols-[auto_1fr] gap-x-3 rounded-lg border p-4",
        container,
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
      {...props}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4", icon)} />
      <div>
        <p className="m-0 text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 mb-0 text-sm leading-6 text-secondary">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
