import { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";
import type { Material } from "../../shared/content";
import { base } from "../lib";
import { Button, Dialog, Row, Notice } from "../styles";
export default function MaterialViewer({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  const [text, setText] = useState("Loading document…");
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const url = material.path ? base + material.path : "";
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    titleRef.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
      before?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    if (material.kind === "docx") {
      import("fflate")
        .then(async (zip) => {
          const r = await fetch(url, { signal: abort.signal });
          if (!r.ok) throw Error();
          const bytes = new Uint8Array(await r.arrayBuffer());
          if (bytes.length > 2 * 1024 * 1024) throw Error();
          const files = zip.unzipSync(bytes, {
            filter: (f) =>
              f.name === "word/document.xml" &&
              f.originalSize <= 4 * 1024 * 1024,
          });
          if (!files["word/document.xml"]) throw Error();
          const xml = new DOMParser().parseFromString(
            zip.strFromU8(files["word/document.xml"]),
            "application/xml",
          );
          if (xml.querySelector("parsererror")) throw Error();
          const value = Array.from(
            xml.getElementsByTagNameNS(
              "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
              "p",
            ),
          )
            .map((p) =>
              Array.from(
                p.getElementsByTagNameNS(
                  "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
                  "t",
                ),
              )
                .map((t) => t.textContent)
                .join(""),
            )
            .join("\n\n");
          if (active)
            setText(
              value ||
                "This document has no text preview. Download it to open in Word.",
            );
        })
        .catch(() => {
          if (active)
            setText(
              "The preview could not be loaded. Download the document to open it in Word.",
            );
        });
    }
    return () => {
      active = false;
      abort.abort();
    };
  }, [url, material.kind]);
  return (
    <Dialog
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <Row>
        <h2 id="material-title" tabIndex={-1} ref={titleRef}>
          {material.title}
        </h2>
        <Button $secondary onClick={onClose} aria-label="Close preview">
          <X size={18} />
        </Button>
      </Row>
      {material.kind === "text" ? (
        <pre>{material.text}</pre>
      ) : material.kind === "image" ? (
        <img src={url} alt={material.alt || material.title} />
      ) : material.kind === "pdf" ? (
        <>
          <iframe title={material.title} src={url} />
          <p>If the PDF does not appear, use the download link below.</p>
        </>
      ) : material.kind === "docx" ? (
        <>
          <Notice>
            Text preview. The original formatting is available in the Word file.
          </Notice>
          <pre aria-live="polite" aria-busy={text === "Loading document…"}>
            {text}
          </pre>
        </>
      ) : (
        <Notice>
          Download .doc files and open them in Word or LibreOffice.
        </Notice>
      )}
      {url && (
        <Button as="a" href={url} download>
          <Download size={16} /> Download file
        </Button>
      )}
    </Dialog>
  );
}
