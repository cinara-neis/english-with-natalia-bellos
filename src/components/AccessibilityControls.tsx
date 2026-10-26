import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hand, X } from "lucide-react";
import styled from "styled-components";
import { Button, AccessibilityToolbar } from "../styles";
import LibrasSupport from "./LibrasSupport";
type Preferences = { largeText: boolean; highContrast: boolean };
const defaults: Preferences = { largeText: false, highContrast: false };
const FloatingButton = styled.button`
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  z-index: 1000;
  width: 3.75rem;
  height: 3.75rem;
  border: 2px solid white;
  border-radius: 50%;
  background: #164f9e;
  color: white;
  cursor: pointer;
  box-shadow: 0 3px 14px #0004;
  display: grid;
  place-items: center;
  &:hover { background: #103d7b; }
  &:focus-visible { outline: 3px solid #111; outline-offset: 3px; }
  svg { position: absolute; }
  svg:first-child { transform: translate(-7px, 3px) rotate(-20deg); }
  svg:last-child { transform: translate(8px, -4px) rotate(15deg); }
`;
const SettingsDialog = styled.dialog`
  width: min(30rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  box-sizing: border-box;
  overflow: auto;
  padding: clamp(1rem, 4vw, 1.75rem);
  border: 1px solid #b7c2b4;
  border-radius: 1rem;
  background: #fffefa;
  color: #253932;
  &::backdrop { background: #10251b80; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  h2 { margin: 0; font-size: 1.5rem; }
  p, a { overflow-wrap: anywhere; }
  html[data-high-contrast="true"] & { background: #000; color: #fff; border-color: #fff; }
`;
export default function AccessibilityControls() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("english-accessibility") || "{}",
      );
      return {
        largeText: saved.largeText === true,
        highContrast: saved.highContrast === true,
      };
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.largeText = String(preferences.largeText);
    document.documentElement.dataset.highContrast = String(
      preferences.highContrast,
    );
    try {
      localStorage.setItem(
        "english-accessibility",
        JSON.stringify(preferences),
      );
    } catch {
      /* Preferences still work when storage is unavailable. */
    }
  }, [preferences]);
  return createPortal(
    <>
      <FloatingButton ref={trigger} type="button" aria-label="Open accessibility settings"
        title="Accessibility and Libras" aria-haspopup="dialog" aria-expanded={open}
        aria-controls="accessibility-dialog" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <Hand size={27} aria-hidden="true" /><Hand size={27} aria-hidden="true" />
      </FloatingButton>
      <SettingsDialog ref={dialog} id="accessibility-dialog" aria-labelledby="accessibility-title"
        onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header>
        <h2 id="accessibility-title">Accessibility</h2>
        <Button $secondary type="button" aria-label="Close accessibility settings" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></Button>
      </header>
      <AccessibilityToolbar>
        <Button
          $secondary
          aria-pressed={preferences.largeText}
          onClick={() =>
            setPreferences((p) => ({ ...p, largeText: !p.largeText }))
          }
        >
          Larger text
        </Button>
        <Button
          $secondary
          aria-pressed={preferences.highContrast}
          onClick={() =>
            setPreferences((p) => ({ ...p, highContrast: !p.highContrast }))
          }
        >
          High contrast
        </Button>
        <Button $secondary onClick={() => setPreferences(defaults)}>
          Reset display
        </Button>
      </AccessibilityToolbar>
      <LibrasSupport onEnabled={() => dialog.current?.close()} />
      </SettingsDialog>
    </>, document.body,
  );
}
