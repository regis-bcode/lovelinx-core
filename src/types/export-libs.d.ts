declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: unknown) => Promise<HTMLCanvasElement>;
    jspdf?: { jsPDF: new (options?: unknown) => unknown };
    PptxGenJS?: new () => unknown;
    pptxgen?: new () => unknown;
  }
}

export {};
