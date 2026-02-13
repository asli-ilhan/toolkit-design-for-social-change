'use client';

import { ReactNode } from "react";

type FieldProps = {
  label: string;
  helper?: string;
  tooltip?: string;
  exampleTitle?: string;
  exampleBody?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export function Field({
  label,
  helper,
  tooltip,
  exampleTitle,
  exampleBody,
  required,
  error,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white">
          <span>{label}</span>
          {required && (
            <span className="rounded-full border border-white/30 px-1.5 py-[1px] text-[10px] uppercase tracking-[0.18em] text-white/70">
              Required
            </span>
          )}
        </div>
        {tooltip && (
          <span className="cursor-help text-[10px] uppercase tracking-[0.18em] text-white/50">
            What counts?
          </span>
        )}
      </div>
      {helper && (
        <p className="text-[11px] leading-snug text-white/60">{helper}</p>
      )}
      <div>{children}</div>
      {exampleBody && (
        <details className="mt-1 text-[11px] text-white/60">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-white/55">
            Show example
          </summary>
          <div className="mt-1 rounded border border-white/10 bg-white/[0.03] p-2">
            {exampleTitle && (
              <div className="mb-0.5 text-[11px] font-medium text-white/80">
                {exampleTitle}
              </div>
            )}
            <p className="text-[11px] leading-snug text-white/70">
              {exampleBody}
            </p>
          </div>
        </details>
      )}
      {error && (
        <p className="rounded border border-red-500/70 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}

