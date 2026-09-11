import { useCallback, useEffect, useState } from "react";
import { PlaidLinkButton } from "./PlaidLink";

const STORAGE_KEY = "fintrace:onboarding-completed";

type Step = 0 | 1 | 2;

interface Props {
  onComplete: () => void;
  onLinkSuccess: () => void;
}

export function useOnboardingComplete() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function Onboarding({ onComplete, onLinkSuccess }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    onComplete();
  }, [onComplete]);

  const handleLinkSuccess = useCallback(() => {
    finish();
    onLinkSuccess();
  }, [finish, onLinkSuccess]);

  const goTo = useCallback(
    (next: Step) => {
      if (transitioning) return;
      setDirection(next > step ? "forward" : "back");
      setTransitioning(true);
    },
    [transitioning, step]
  );

  // After exit animation, swap step and enter
  useEffect(() => {
    if (!transitioning) return;
    const timer = setTimeout(() => {
      setStep((prev) => {
        const next = direction === "forward" ? prev + 1 : prev - 1;
        return Math.max(0, Math.min(2, next)) as Step;
      });
      setTransitioning(false);
    }, 250); // matches step-exit duration
    return () => clearTimeout(timer);
  }, [transitioning, direction]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div
        className={`max-w-lg w-full ${transitioning ? "step-exit" : "step-enter"}`}
      >
        {step === 0 && <StepWelcome onNext={() => goTo(1)} />}
        {step === 1 && <StepHowItWorks onNext={() => goTo(2)} />}
        {step === 2 && (
          <StepConnect onLinkSuccess={handleLinkSuccess} onSkip={finish} />
        )}
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-2 mt-10">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => {
              if (i !== step && !transitioning) goTo(i as Step);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === step
                ? "bg-accent w-5"
                : "bg-zinc-700 hover:bg-zinc-600"
            }`}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <span className="text-accent text-base font-bold">F</span>
        </div>
        <span className="text-xl font-semibold tracking-tight">fintrace</span>
      </div>

      <h2 className="text-zinc-100 text-lg font-medium mb-3">
        AI-powered financial copilot
        <br />
        <span className="text-accent">with human-in-the-loop approval</span>
      </h2>

      <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto mb-10">
        Fintrace connects to your bank accounts via Plaid, analyzes transactions
        with deterministic agents, and proposes financial actions — but never
        acts without your explicit approval. Every decision is logged to an
        append-only audit trail.
      </p>

      <button
        onClick={onNext}
        className="px-8 py-2.5 bg-accent text-surface-0 font-semibold text-sm rounded-lg
                   hover:bg-emerald-300 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

function StepHowItWorks({ onNext }: { onNext: () => void }) {
  const cards = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v16H4z" />
          <path d="M4 10h16" />
          <path d="M10 4v16" />
        </svg>
      ),
      title: "Subscription Detection",
      desc: "Spots recurring charges using frequency heuristics and proposes cancellations for review.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      title: "Savings Auto-Transfer",
      desc: "Detects income deposits, calculates surplus, and proposes a savings transfer amount.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      ),
      title: "Spending Anomaly",
      desc: "Uses z-score outlier detection to flag unusual transactions for your review.",
    },
  ];

  return (
    <div className="text-center">
      <h2 className="text-zinc-100 text-lg font-medium mb-2">How It Works</h2>
      <p className="text-zinc-500 text-sm mb-8">
        Three deterministic agents analyze your transactions
      </p>

      <div className="space-y-3 mb-8">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`card-stagger stagger-${i + 1} flex items-start gap-4 p-4 bg-surface-1 border border-surface-3 rounded-lg text-left`}
          >
            <div className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
              {card.icon}
            </div>
            <div>
              <h3 className="text-zinc-200 text-sm font-medium">{card.title}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed mt-1">
                {card.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-zinc-600 text-xs mb-8">
        Every action requires your approval. Every decision is logged.
      </p>

      <button
        onClick={onNext}
        className="px-8 py-2.5 bg-accent text-surface-0 font-semibold text-sm rounded-lg
                   hover:bg-emerald-300 transition-colors"
      >
        Next
      </button>
    </div>
  );
}

function StepConnect({
  onLinkSuccess,
  onSkip,
}: {
  onLinkSuccess: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="text-center">
      <h2 className="text-zinc-100 text-lg font-medium mb-2">
        Connect Your Account
      </h2>
      <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto mb-8">
        This demo uses Plaid Sandbox — no real bank credentials are needed.
        Use the test credentials below to connect a simulated bank account.
      </p>

      {/* Sandbox credentials */}
      <div className="inline-flex items-center gap-4 px-5 py-3 bg-surface-1 border border-surface-3 rounded-lg mb-8">
        <div className="text-left">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider block">
            Username
          </span>
          <code className="text-sm text-zinc-200 font-mono">user_good</code>
        </div>
        <div className="w-px h-8 bg-surface-3" />
        <div className="text-left">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider block">
            Password
          </span>
          <code className="text-sm text-zinc-200 font-mono">pass_good</code>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <PlaidLinkButton onSuccess={onLinkSuccess} />
        <button
          onClick={onSkip}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
