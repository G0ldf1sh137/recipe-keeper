import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { getRecipe } from "#/recipes/recipes.functions";
import { scaleQuantity } from "#/recipes/quantity";
import { useRecipeScale } from "#/recipes/useRecipeScale";
import { ScaleToggle } from "#/recipes/ScaleToggle";
import { parseStepDuration, formatDuration } from "#/recipes/parseStepDuration";

const cookSearchSchema = z.object({ st: z.string().optional() });

export const Route = createFileRoute("/recipes/$recipeId/cook")({
  validateSearch: cookSearchSchema,
  loaderDeps: ({ search }) => ({ shareToken: search.st }),
  loader: async ({ params, deps }) =>
    getRecipe({ data: { id: params.recipeId, shareToken: deps.shareToken } }),
  component: CookModePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Recipe not found</h1>
      <p className="mt-2 text-ink/60">
        This recipe doesn't exist, or isn't shared with you.{" "}
        <Link to="/" className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400">
          Back home
        </Link>
      </p>
    </div>
  ),
});

// Wake locks are released automatically when the tab loses visibility, so a
// backgrounded phone re-locking the screen doesn't get stuck awake forever —
// re-request when the tab regains focus to cover the common prop-the-phone-up case.
function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Ignore — e.g. denied by the browser or page not visible yet.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void lock?.release();
    };
  }, []);
}

type TimerState = { totalSeconds: number; remainingSeconds: number; stepIndex: number } | null;

// Minimal ambient typing for the (non-standard, Chrome/Safari-prefixed) SpeechRecognition
// API. lib.dom.d.ts already ships SpeechRecognitionEvent/SpeechRecognitionErrorEvent — reuse
// those, and only declare the recognizer interface + constructor + window properties.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type VoiceCommand = "next" | "previous" | "repeat" | "startTimer" | "stopListening";

const commandMatchers: { command: VoiceCommand; keywords: string[] }[] = [
  { command: "stopListening", keywords: ["stop listening"] },
  { command: "startTimer", keywords: ["start timer", "start the timer"] },
  { command: "repeat", keywords: ["repeat"] },
  { command: "previous", keywords: ["previous", "back", "go back"] },
  { command: "next", keywords: ["next"] },
];

function matchCommand(transcript: string): VoiceCommand | undefined {
  const normalized = transcript.trim().toLowerCase();
  return commandMatchers.find((m) => m.keywords.some((kw) => normalized.includes(kw)))?.command;
}

function speak(text: string) {
  speechSynthesis.cancel(); // cancel any in-flight utterance so repeated "repeat"s don't queue
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// Auto-restarts on Chrome's habit of stopping the recognizer after a pause even with
// `continuous: true`; `shouldRestartRef` is turned off by an explicit stop() or a
// permission-denied error so it can't loop-restart forever after either.
function useVoiceControl(onCommand: (command: VoiceCommand) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    setSupported((window.SpeechRecognition ?? window.webkitSpeechRecognition) != null);
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const command = matchCommand(transcript);
      if (command) onCommandRef.current(command);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        setError("Microphone access denied. Enable it in your browser settings to use voice control.");
        setListening(false);
        return;
      }
      if (event.error === "no-speech") return; // benign — restart happens via onend as normal
      setError("Voice recognition error — try again.");
    };
    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started, or a transient failure — ignore.
        }
      } else {
        setListening(false);
      }
    };
    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    setError(null);
    recognition.start();
    setListening(true);
  }

  function stop() {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }

  function toggleListening() {
    if (listening) stop();
    else start();
  }

  return { supported, listening, error, toggleListening, stop };
}

// A short beep via Web Audio — no external asset needed. Browsers require a
// prior user gesture before audio can play; the AudioContext is created and
// resumed at Start-timer click time (a real gesture), so scheduling this tone
// later when the countdown reaches zero still works on an already-unlocked context.
function playBeep(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.6);
}

function CookModePage() {
  const recipe = Route.useLoaderData();
  const { st: shareToken } = Route.useSearch();
  const { scale, setScale, customInput, handleCustomInputChange, activeFactor, isUnscaled } = useRecipeScale();
  const [stepIndex, setStepIndex] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [timer, setTimer] = useState<TimerState>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useWakeLock();

  useEffect(() => {
    return () => void audioContextRef.current?.close();
  }, []);

  function startTimer(seconds: number) {
    audioContextRef.current ??= new AudioContext();
    void audioContextRef.current.resume();
    setTimer({ totalSeconds: seconds, remainingSeconds: seconds, stepIndex });
  }

  function clearTimer() {
    setTimer(null);
  }

  // Ticks the active timer down once a second; stops once it reaches zero.
  useEffect(() => {
    if (!timer || timer.remainingSeconds <= 0) return;
    const id = setInterval(() => {
      setTimer((prev) => (prev ? { ...prev, remainingSeconds: Math.max(0, prev.remainingSeconds - 1) } : prev));
    }, 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Runs whenever the timer object changes, but only alerts when it's the
  // exact tick that reaches zero — once ticking stops, `timer` no longer
  // changes on its own, so this can't re-fire without a new user action.
  useEffect(() => {
    if (!timer || timer.remainingSeconds !== 0) return;
    if (audioContextRef.current) playBeep(audioContextRef.current);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  }, [timer]);

  const stepCount = recipe.steps.length;
  const step = recipe.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;
  const stepDuration = stepCount > 0 ? parseStepDuration(step.text) : undefined;

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(stepCount - 1, index)));
  }

  const {
    supported: voiceSupported,
    listening: voiceListening,
    error: voiceError,
    toggleListening: toggleVoiceListening,
    stop: stopVoiceListening,
  } = useVoiceControl((command) => {
    switch (command) {
      case "next":
        goTo(stepIndex + 1);
        break;
      case "previous":
        goTo(stepIndex - 1);
        break;
      case "repeat":
        if (stepCount > 0) speak(step.text);
        break;
      case "startTimer":
        if (stepDuration !== undefined) startTimer(stepDuration);
        break;
      case "stopListening":
        stopVoiceListening();
        break;
    }
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setStepIndex((i) => Math.min(stepCount - 1, i + 1));
      if (e.key === "ArrowLeft") setStepIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepCount]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col p-4 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: recipe.id }}
          search={{ st: shareToken }}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          ← Exit
        </Link>
        <h1 className="font-serif text-lg font-semibold text-ink">{recipe.title}</h1>
        <span className="text-sm text-ink/60">
          {stepCount > 0 ? `Step ${stepIndex + 1} of ${stepCount}` : ""}
        </span>
      </div>

      {timer && (
        <div
          className={`mt-3 flex items-center justify-between rounded-lg border-2 px-4 py-2 ${
            timer.remainingSeconds === 0 ? "border-accent-500 bg-accent-50" : "border-accent-200 bg-surface"
          }`}
        >
          <span className="font-medium text-ink">
            {timer.remainingSeconds === 0 ? "⏰ Time's up!" : `⏱ ${formatDuration(timer.remainingSeconds)}`}
          </span>
          <button
            type="button"
            onClick={clearTimer}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            {timer.remainingSeconds === 0 ? "Dismiss" : "Cancel"}
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIngredientsOpen((open) => !open)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          {ingredientsOpen ? "Hide ingredients" : "Show ingredients"}
        </button>
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoiceListening}
            aria-pressed={voiceListening}
            aria-label={voiceListening ? "Voice control, listening" : "Voice control, off"}
            className={
              voiceListening
                ? "flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                : "rounded-lg border-2 border-accent-300 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
            }
          >
            {voiceListening && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />}
            {voiceListening ? "Listening…" : "🎤 Voice control"}
          </button>
        )}
      </div>

      {voiceError && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <span>{voiceError}</span>
        </div>
      )}

      <div className="mt-4">
        {ingredientsOpen && (
          <div className="mt-3 rounded-xl border-2 border-accent-200 bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-ink">Ingredients</h2>
              <ScaleToggle
                scale={scale}
                onScaleChange={setScale}
                customInput={customInput}
                onCustomInputChange={handleCustomInputChange}
              />
            </div>
            <ul className="mt-2 list-inside list-disc text-ink/80">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  {[isUnscaled ? ing.qty : scaleQuantity(ing.qty, activeFactor), ing.unit, ing.name]
                    .filter(Boolean)
                    .join(" ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {stepCount === 0 ? (
        <p className="mt-8 flex-1 text-center text-ink/60">This recipe has no steps yet.</p>
      ) : (
        <div className="relative mt-4 flex flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center rounded-2xl border-2 border-accent-200 bg-surface p-6 sm:p-10">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              aria-label="Previous step"
              className="absolute inset-y-0 left-0 w-1/3 cursor-pointer disabled:cursor-default"
            />
            <button
              type="button"
              onClick={() => goTo(stepIndex + 1)}
              disabled={isLast}
              aria-label="Next step"
              className="absolute inset-y-0 right-0 w-1/3 cursor-pointer disabled:cursor-default"
            />
            <div className="max-w-lg text-center">
              <p className="text-2xl leading-relaxed text-ink sm:text-3xl">{step.text}</p>
              {step.imageUrls.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {step.imageUrls.map((url, i) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Step ${stepIndex + 1} photo ${i + 1}`}
                      loading="lazy"
                      className="max-h-64 rounded-lg object-cover shadow-sm"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {stepDuration !== undefined && (
            <button
              type="button"
              onClick={() => startTimer(stepDuration)}
              className="mt-4 rounded-lg border-2 border-accent-300 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
            >
              ⏱ Start {formatDuration(stepDuration)} timer
            </button>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              className="rounded-lg border-2 border-accent-300 px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-40"
            >
              Previous
            </button>
            {isLast ? (
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: recipe.id }}
                search={{ st: shareToken }}
                className="rounded-lg bg-accent-600 px-6 py-3 font-medium text-white transition-colors hover:bg-accent-700"
              >
                Done — back to recipe
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => goTo(stepIndex + 1)}
                className="rounded-lg bg-accent-600 px-6 py-3 font-medium text-white transition-colors hover:bg-accent-700"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
