import React from "react";

type PileWidgetProps = {
  title: string;
  count: number;
  subtitle?: string;
  icon?: React.ReactNode;
};

export function PileWidget({ title, count, subtitle, icon }: PileWidgetProps) {
  return (
    <div className="pile-widget">
      <div className="pile-widget__stack">
        <div className="pile-widget__card" />
        <div className="pile-widget__card" />
        <div className="pile-widget__card" />
        <div className="pile-widget__badge">{count}</div>
        {icon && <div className="pile-widget__icon">{icon}</div>}
      </div>
      <div className="pile-widget__info">
        <div className="pile-widget__title">{title}</div>
        {subtitle && <div className="pile-widget__subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
