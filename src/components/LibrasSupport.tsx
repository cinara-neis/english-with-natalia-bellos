import { useState } from "react";
import { Button } from "../styles";

let loading: Promise<void> | undefined;
function loadWidget() {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    // The official widget initializes itself; do not create a second instance.
    const timer = window.setTimeout(() => fail(), 30000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new Error("VLibras could not be loaded."));
    }
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    document.body.appendChild(script);
  });
  return loading;
}

export default function LibrasSupport({ onEnabled }: { onEnabled?: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  return (
    <details style={{ marginTop: "1rem" }}>
      <summary style={{ cursor: "pointer", paddingBlock: ".5rem" }}>
        Libras — Brazilian Sign Language
      </summary>
      <p>
        VLibras translates Portuguese text into Libras. It does not translate
        this English interface. For English lessons, ask your teacher for a
        Portuguese version or a Libras video.
      </p>
      <Button $secondary disabled={state === "loading" || state === "loaded"}
        onClick={async () => {
          setState("loading");
          try { await loadWidget(); setState("loaded"); onEnabled?.(); }
          catch { setState("error"); }
        }}>
        {state === "loading" ? "Loading VLibras…" : state === "loaded" ? "VLibras enabled" : state === "error" ? "Retry VLibras" : "Enable VLibras"}
      </Button>
      <p role="status" aria-live="polite">
        {state === "loaded" ? "Use the floating VLibras button to open the translator, then select Portuguese text. The external service may take a moment to start." : state === "error" ? "VLibras is unavailable. Check your connection and try again." : "The external VLibras service loads only when you enable it. An internet connection is required."}
      </p>
      <details>
        <summary style={{ cursor: "pointer", paddingBlock: ".5rem" }}>Portuguese accessibility guide (for VLibras)</summary>
        <div lang="pt-BR">
          <p>Bem-vindo ao blog de Natalia Bellos. Selecione um aluno no menu para encontrar os materiais e acompanhar seu progresso.</p>
          <p>Na área de acessibilidade, você pode aumentar o texto e ativar o alto contraste. Para traduzir um texto em português para Libras, abra o botão flutuante do VLibras e selecione o texto.</p>
          <p>Para as aulas em inglês, solicite à professora uma versão em português ou um vídeo em Libras.</p>
        </div>
      </details>
      <p><a href="https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras/vlibras" target="_blank" rel="noopener noreferrer">About VLibras (Portuguese, opens in a new tab)</a></p>
    </details>
  );
}
