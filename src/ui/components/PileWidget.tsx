import React from "react";

type PileWidgetProps = {
  title: string;
  count: number;
  subtitle?: string;
  icon?: React.ReactNode;
  compact?: boolean;
};

export function PileWidget({ title, count, subtitle, icon, compact = false }: PileWidgetProps) {
  const className = compact ? "pile-widget ui-panel--compact pile-widget--compact" : "pile-widget";

  return (
    <div className={className}>
      <div className="pile-widget__stack">
        <div className="pile-widget__card" />
        <div className="pile-widget__card" />
        <div className="pile-widget__card" />
        <div className="pile-widget__badge">{count}</div>
        {icon && <div className="pile-widget__icon">{icon}</div>}
      </div>
      <div className="pile-widget__info">
        <div className="pile-widget__title">{title}</div>
        {subtitle && !compact && <div className="pile-widget__subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
