"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const steps = [
  {
    title: "Welcome to Cryptex",
    body: "Set up your workspace and follow your watchlist in one place.",
  },
  {
    title: "Place your first trade",
    body: "Use market or limit orders with stop-loss and take-profit.",
  },
  {
    title: "Track your performance",
    body: "Review portfolio P&L, closed trades, and notifications.",
  },
];

export default function WalkthroughModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const updateWalkthrough = async (
    action: "dismiss" | "complete" | "reset"
  ) => {
    setWorking(true);
    try {
      await fetch("/api/settings/first-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onComplete();
    } finally {
      setWorking(false);
    }
  };

  const next = async () => {
    if (index < steps.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    onClose();
    await updateWalkthrough("complete");
  };

  const skip = async () => {
    onClose();
    await updateWalkthrough("dismiss");
  };

  return (
    <Modal open={open} onClose={onClose} title={steps[index].title}>
      <p className="text-sm text-[var(--muted)]">{steps[index].body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={skip}
          disabled={working}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          Skip walkthrough
        </button>
        <Button onClick={next} disabled={working}>
          {index === steps.length - 1 ? "Finish" : "Next"}
        </Button>
      </div>
    </Modal>
  );
}
