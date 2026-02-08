import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GuideMode } from "../utils/tutorialGuide";
import type { TutorialStep } from "../utils/tutorialSteps";

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TutorialOverlayProps = {
  open: boolean;
  mode: GuideMode;
  steps: TutorialStep[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onSkip: () => void;
  onDone: () => void;
};

const FALLBACK_DO_THIS: Record<string, string> = {
  DRAW_2: "Click Draw 2.",
  PLAY_TERRAFORM: "Play a Terraform orb.",
  PLAY_IMPACT: "Play an Impact orb.",
  END_PLAY: "Click End Play.",
  ADVANCE: "Click Advance.",
};

export function TutorialOverlay({
  open,
  mode,
  steps,
  currentIndex,
  onPrev,
  onNext,
  onClose,
  onSkip,
  onDone,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevOverflow = useRef<string>("");

  const step = steps[currentIndex];
  const isLast = currentIndex >= steps.length - 1;

  const measureTarget = useCallback(() => {
    if (!open || !step?.targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      return;
    }
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    measureTarget();
  }, [open, measureTarget, currentIndex]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        measureTarget();
      });
    };
    const onResize = () => measureTarget();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, measureTarget]);

  useEffect(() => {
    if (!open) return;
    prevOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow.current;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (isLast) {
          onDone();
        } else {
          onNext();
        }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (currentIndex > 0) onPrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, currentIndex, isLast, onClose, onDone, onNext, onPrev]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect) return null;
    const pad = 10;
    return {
      top: Math.max(0, targetRect.top - pad),
      left: Math.max(0, targetRect.left - pad),
      width: Math.max(0, targetRect.width + pad * 2),
      height: Math.max(0, targetRect.height + pad * 2),
    };
  }, [targetRect]);

  const placement = step?.placement ?? "center";
  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!targetRect || placement === "center") {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const { top, left, width, height } = targetRect;
    switch (placement) {
      case "top":
        return { top, left: left + width / 2, transform: "translate(-50%, -110%)" };
      case "bottom":
        return { top: top + height, left: left + width / 2, transform: "translate(-50%, 16px)" };
      case "left":
        return { top: top + height / 2, left, transform: "translate(-110%, -50%)" };
      case "right":
        return { top: top + height / 2, left: left + width, transform: "translate(16px, -50%)" };
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  }, [placement, targetRect]);

  const guidedLine = useMemo(() => {
    if (mode !== "GUIDED" || !step?.advanceOn) return null;
    if (step.doThisNow) return step.doThisNow;
    if (step.advanceOn.kind === "ACTION") {
      return FALLBACK_DO_THIS[step.advanceOn.type] ?? null;
    }
    return null;
  }, [mode, step]);

  if (!open || !step) return null;

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <div className="tutorial-overlay__backdrop" onClick={onClose} />
      {spotlightStyle && (
        <div
          className="tutorial-overlay__spotlight"
          style={{
            top: spotlightStyle.top,
            left: spotlightStyle.left,
            width: spotlightStyle.width,
            height: spotlightStyle.height,
          }}
        />
      )}
      <div className="tutorial-card" style={cardStyle}>
        <div className="tutorial-card__header">
          <div>
            <div className="tutorial-card__step">
              Step {currentIndex + 1} of {steps.length}
            </div>
            <h3>{step.title}</h3>
          </div>
          <button className="tutorial-card__close" onClick={onClose} aria-label="Close tutorial">
            ✕
          </button>
        </div>
        {mode === "GUIDED" && <div className="tutorial-card__badge">Guided</div>}
        <p className="tutorial-card__body">{step.body}</p>
        {guidedLine && (
          <div className="tutorial-card__do-this">
            <span>Do this now:</span> {guidedLine}
          </div>
        )}
        <div className="tutorial-card__actions">
          <button onClick={onPrev} disabled={currentIndex === 0}>
            Back
          </button>
          {!isLast && <button onClick={onNext}>Next</button>}
          {isLast && <button onClick={onDone}>Done</button>}
          <div className="tutorial-card__spacer" />
          <button className="tutorial-card__secondary" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
