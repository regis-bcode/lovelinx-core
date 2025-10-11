const SCRIPT_SOURCES = {
  html2canvas: "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  pptxgenjs: "https://cdn.jsdelivr.net/npm/pptxgenjs@3.14.0/dist/pptxgen.bundle.min.js",
} as const;

type ScriptKey = keyof typeof SCRIPT_SOURCES;

const scriptPromises = new Map<ScriptKey, Promise<void>>();

type ExtendedWindow = Window & { pptxgen?: unknown };

type PptxConstructor = new () => unknown;

const resolvePptxConstructor = (candidate: unknown): PptxConstructor | null => {
  if (typeof candidate === "function") {
    return candidate as PptxConstructor;
  }

  if (candidate && typeof candidate === "object" && "default" in (candidate as Record<string, unknown>)) {
    const { default: defaultExport } = candidate as { default?: unknown };
    if (typeof defaultExport === "function") {
      return defaultExport as PptxConstructor;
    }
  }

  return null;
};

const ensureScript = (key: ScriptKey) => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const existingGlobal =
    (key === "html2canvas" && window.html2canvas) ||
    (key === "jspdf" && window.jspdf?.jsPDF) ||
    (key === "pptxgenjs" && (window.PptxGenJS || (window as ExtendedWindow).pptxgen));

  if (existingGlobal) {
    return Promise.resolve();
  }

  if (!scriptPromises.has(key)) {
    const promise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-export-lib="${key}"]`,
      );

      if (existingScript) {
        if (existingScript.dataset.loaded === "true") {
          resolve();
          return;
        }

        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error(`Falha ao carregar ${key}`)));
        return;
      }

      const script = document.createElement("script");
      script.src = SCRIPT_SOURCES[key];
      script.async = true;
      script.dataset.exportLib = key;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      });
      script.addEventListener("error", () => {
        scriptPromises.delete(key);
        reject(new Error(`Falha ao carregar script ${key}`));
      });
      document.body.appendChild(script);
    });

    scriptPromises.set(key, promise);
  }

  return scriptPromises.get(key)!;
};

export const loadHtml2Canvas = async () => {
  await ensureScript("html2canvas");
  return window.html2canvas ?? null;
};

export const loadJsPDF = async () => {
  await ensureScript("jspdf");
  return window.jspdf?.jsPDF ?? null;
};

export const loadPptxGenJS = async () => {
  await ensureScript("pptxgenjs");

  const extendedWindow = window as ExtendedWindow;
  const candidates = [window.PptxGenJS, extendedWindow.pptxgen];

  for (const candidate of candidates) {
    const constructor = resolvePptxConstructor(candidate);
    if (constructor) {
      return constructor;
    }
  }

  console.error("PptxGenJS constructor not available after script load", candidates);
  return null;
};

export {}; // Ensure this file is treated as a module
