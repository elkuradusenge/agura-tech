/** Buttons, inputs and the shared visual vocabulary. Lucide icons only. */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warning";
type Size = "sm" | "md" | "lg";

/* Pill buttons, 150 ms press feedback. The tokens flip with the theme, so no
   dark: variants are needed for colour. */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-on hover:bg-primary-hover active:bg-primary-active shadow-e1",
  secondary:
    "border border-line-strong bg-surface text-ink-heading hover:border-primary hover:bg-primary-tint",
  ghost: "bg-transparent text-primary-text hover:bg-primary-tint",
  danger: "bg-danger text-canvas hover:opacity-90",
  warning: "bg-warning text-canvas hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "tap-target press inline-flex items-center justify-center gap-2 rounded-pill font-medium",
        "disabled:cursor-not-allowed disabled:opacity-60",
        SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, error, required, children, htmlFor }: FieldProps) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span className="block text-sm font-medium text-ink-heading">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {" *"}
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="muted block text-xs">{hint}</span> : null}
      {error ? (
        <span className="block text-xs font-medium text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/* 12px radius, 1px hairline, teal focus ring. */
const CONTROL = "tap-target field";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-24", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "appearance-none pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-ink-heading",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  info: "bg-primary-tint text-primary-text",
};

/**
 * Status is never shown by colour alone: every badge carries a text label, which
 * is what a screen reader announces and what a colour blind user reads.
 */
export function Badge({
  tone = "neutral",
  children,
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
        BADGE_TONES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return <div className={cn("card", interactive && "card-interactive", className)}>{children}</div>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-raised"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-pill bg-primary transition-all duration-slow ease-material"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-card bg-surface-raised", className)} />;
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong p-8 text-center">
      {icon}
      <p className="font-medium text-ink-heading">{title}</p>
      {body ? <p className="muted text-sm">{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <div className="rounded-panel border border-danger bg-danger-tint p-6" role="alert">
      <p className="font-medium text-danger">{title}</p>
      {body ? <p className="muted mt-1 text-sm">{body}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
