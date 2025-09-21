export type ImageTheme = { theme: "light" | "dark"; color: string; };

function getLuma(r: number, g: number, b: number): number {
  // ITU-R BT.709 perceived luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function extractImageTheme(url: string): Promise<ImageTheme> {
  return new Promise<ImageTheme>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("noctx");
        // downscale for performance
        const w = 64, h = 64;
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel (skip alpha)
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          count++;
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        const l = getLuma(r, g, b);
        const theme: ImageTheme["theme"] = l > 150 ? "light" : "dark";
        const color = theme === "light" ? "#111827" : "#F9FAFB"; // zinc-900 vs zinc-50
        resolve({ theme, color });
      } catch {
        resolve({ theme: "dark", color: "#F9FAFB" });
      }
    };
    img.onerror = () => resolve({ theme: "dark", color: "#F9FAFB" });
  });
}

export function textClassForColor(hex: string): string {
  // crude mapping for Tailwind utility closest colors
  // choose dark text if light bg and vice-versa (handled by extractImageTheme)
  return hex === "#111827" ? "text-zinc-900" : "text-zinc-50";
}

export function overlayForTheme(theme: ImageTheme["theme"]): string {
  // stronger overlay when background is light to keep contrast
  return theme === "light" ? "bg-black/50" : "bg-black/30";
}

export function iconClassForTheme(theme: ImageTheme["theme"]): string {
  return theme === "light" ? "text-zinc-900" : "text-white";
}

export function useImageTheme(url?: string): { theme: ImageTheme["theme"]; textClass: string; iconClass: string; overlayClass: string; } {
  const def = { theme: "dark" as const, textClass: "text-white", iconClass: "text-white", overlayClass: "bg-black/30" };
  if (typeof window === "undefined") return def;
  // simple state-less hook alternative to avoid React dep in utility
  // caller can re-render when url changes by passing as dependency
  // we expose a synchronous best-effort using performance.now() cache via window
  const w = window as any;
  const cacheKey = `__img_theme_${url}`;
  if (url && w[cacheKey]) return w[cacheKey];
  if (url) {
    extractImageTheme(url).then((res) => {
      w[cacheKey] = { theme: res.theme, textClass: textClassForColor(res.color), iconClass: iconClassForTheme(res.theme), overlayClass: overlayForTheme(res.theme) };
      // trigger a micro reflow by dispatching event; components may listen if desired
      window.dispatchEvent(new CustomEvent("image-theme-ready", { detail: { url, ...w[cacheKey] } }));
    });
  }
  return def;
}
