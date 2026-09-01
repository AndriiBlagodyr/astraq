import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[transform,background,border-color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-45 motion-safe:hover:-translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-[image:var(--ds-gradient-brand)] text-[var(--ds-brand-contrast)] shadow-[var(--ds-shadow-brand)]",
        secondary:
          "border border-border-strong bg-surface-muted text-foreground hover:border-brand",
        ghost:
          "border border-transparent bg-transparent text-secondary hover:bg-surface-muted hover:text-foreground",
        danger:
          "border border-negative/35 bg-negative/12 text-negative hover:bg-negative/18",
      },
      size: {
        sm: "min-h-9 px-4 text-xs",
        md: "min-h-11 px-5",
        lg: "min-h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      className={cn("size-11 min-h-0 shrink-0 px-0", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function Card({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-[image:var(--ds-gradient-surface)] p-6 shadow-[var(--ds-shadow-soft)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"header">) {
  return <header className={cn("mb-5 grid gap-2", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn(
        "m-0 font-display text-xl font-bold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p className={cn("m-0 leading-7 text-secondary", className)} {...props} />
  );
}

export type InputProps = ComponentPropsWithoutRef<"input"> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-11 w-full rounded-md border border-border-strong bg-surface-muted px-4 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted hover:border-brand/55 focus-visible:border-brand disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-negative",
        className,
      )}
      {...props}
    />
  );
}

export type FormFieldProps = ComponentPropsWithoutRef<"div"> & {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
  ...props
}: FormFieldProps) {
  const description = error ?? hint;

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-foreground"
      >
        {label}
      </label>
      {children}
      {description ? (
        <p
          className={cn("m-0 text-xs text-muted", error && "text-negative")}
          role={error ? "alert" : undefined}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

const badgeVariants = cva(
  "inline-flex min-h-7 w-fit items-center rounded-full border px-3 text-xs font-semibold tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-surface-muted text-secondary",
        brand: "border-brand/25 bg-brand/10 text-brand",
        positive: "border-positive/25 bg-positive/10 text-positive",
        negative: "border-negative/25 bg-negative/10 text-negative",
        warning: "border-warning/25 bg-warning/10 text-warning",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export type FeedbackProps = ComponentPropsWithoutRef<"div"> & {
  title: string;
  description?: string;
  tone?: "info" | "success" | "warning" | "danger";
};

const feedbackTone = {
  info: "border-brand/25 bg-brand/8",
  success: "border-positive/25 bg-positive/8",
  warning: "border-warning/25 bg-warning/8",
  danger: "border-negative/25 bg-negative/8",
};

export function Feedback({
  title,
  description,
  tone = "info",
  className,
  ...props
}: FeedbackProps) {
  return (
    <div
      className={cn("rounded-lg border p-4", feedbackTone[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
      {...props}
    >
      <p className="m-0 text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 mb-0 text-sm leading-6 text-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Table({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <table
      className={cn("w-full border-collapse text-left text-sm", className)}
      {...props}
    />
  );
}

export function TableWrap({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border bg-surface p-5 shadow-[var(--ds-shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn(
        "border-b border-[var(--ds-row)] py-3 pr-5 text-xs font-semibold uppercase tracking-widest text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn(
        "border-b border-[var(--ds-row)] py-4 pr-5 text-secondary last:pr-0",
        className,
      )}
      {...props}
    />
  );
}
