import { Component, type ReactNode } from "react";

/**
 * Le plateau est rendu en WebGL. Sur une machine qui ne le supporte pas (ou
 * dont le contexte est perdu), on retombe sur la version CSS/SVG du plateau
 * plutôt que de laisser un écran noir : le jeu reste jouable partout.
 */
export function hasWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export class WebGLGuard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("Rendu 3D indisponible, bascule sur le plateau CSS :", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
