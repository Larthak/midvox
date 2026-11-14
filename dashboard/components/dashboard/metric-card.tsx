"use client";

import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  name: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  className?: string;
}

function useCountUp(target: number, active: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 70, damping: 26, mass: 1 });

  useEffect(() => {
    if (!active) return;
    motionValue.set(target);
    const unsubscribe = spring.on("change", (current) => {
      if (ref.current) {
        ref.current.textContent = Math.round(current).toLocaleString();
      }
    });
    return unsubscribe;
  }, [active, target, motionValue, spring]);

  return ref;
}

export const MetricCard = ({
  name,
  value,
  icon,
  description,
  trend,
  className,
}: MetricCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const isNumeric = typeof value === "number";
  const displayRef = useCountUp(isNumeric ? value : 0, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "group panel-surface rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--panel-accent)] hover:shadow-[0_16px_32px_rgba(25,27,20,0.08)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--panel-muted)]">{name}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-[var(--panel-ink)]">
              {isNumeric ? <span ref={displayRef}>0</span> : value}
            </p>
            {trend && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  trend.isUp
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-red-500/10 text-red-600",
                )}
              >
                {trend.isUp ? "+" : ""}
                {trend.value}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1.5 text-xs leading-5 text-[var(--panel-faint)]">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)] transition-transform duration-200 group-hover:scale-105">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};
