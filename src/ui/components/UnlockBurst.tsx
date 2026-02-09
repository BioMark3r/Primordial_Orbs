import React from "react";

export function UnlockBurst({ active }: { active: boolean }) {
  return <span className={`unlock-burst${active ? " unlock-burst--active" : ""}`} aria-hidden="true" />;
}
