import { Component, ReactNode } from "react";

/**
 * Guards a WebGL-dependent subtree (the 3D stage). A handful of real
 * situations can make `THREE.WebGLRenderer` throw synchronously at mount —
 * hardware acceleration disabled, an old GPU, a blocklisted driver, a
 * headless/automated browser — and an uncaught throw there used to crash
 * the ENTIRE round-play screen with Next's full error overlay, making the
 * game unplayable. A decorative 3D backdrop must never be able to take the
 * actual game down with it, so this renders `fallback` instead whenever
 * that happens.
 */
export class WebGLGuard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("Décor 3D indisponible, repli sur le décor 2D :", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Cheap synchronous feature check — skips even trying to mount the 3D
 * canvas when WebGL plainly isn't available, instead of relying only on
 * the error boundary to catch the throw after the fact. Support can't
 * change mid-session, so the result is cached after the first check
 * rather than creating a throwaway canvas on every re-render. */
let cachedWebGLSupport: boolean | null = null;
export function hasWebGL(): boolean {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    cachedWebGLSupport = !!(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    cachedWebGLSupport = false;
  }
  return cachedWebGLSupport;
}
