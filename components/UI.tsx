import { motion } from "framer-motion";
import { useSound } from "@/hooks/useSound";
import React from "react";

export function BigButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "gold" | "danger";
  className?: string;
  type?: "button" | "submit";
}) {
  const { play } = useSound();

  const base =
    "relative font-display uppercase tracking-wider text-lg md:text-xl px-8 py-4 rounded-xl transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-b from-blood to-bloodDark text-white shadow-glowRed hover:shadow-[0_0_55px_rgba(227,18,47,0.75)] active:scale-[0.97] border border-ember/30",
    ghost:
      "bg-white/5 text-white border border-white/15 hover:bg-white/10 active:scale-[0.97]",
    gold:
      "bg-gradient-to-b from-goldSoft to-gold text-black shadow-glowGold hover:shadow-[0_0_45px_rgba(212,175,55,0.65)] active:scale-[0.97]",
    danger:
      "bg-gradient-to-b from-red-900 to-black text-white border border-blood/40 hover:brightness-110 active:scale-[0.97]",
  };

  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.03 }}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      onMouseEnter={() => !disabled && play("ui_hover")}
      onClick={() => {
        if (disabled) return;
        play("ui_click");
        onClick?.();
      }}
    >
      {/* one-shot sheen on mount, not a looping animation — a real studio
          button catches the light once, it doesn't strobe */}
      {variant === "primary" && (
        <motion.span
          className="absolute inset-0 bg-white/20"
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
          style={{ skewX: -20 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function MuteButton() {
  const { muted, toggleMute } = useSound();
  return (
    <button
      onClick={toggleMute}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full bg-black/50 border border-white/15 backdrop-blur flex items-center justify-center text-white/80 hover:text-white hover:border-white/30 transition"
      aria-label="Son"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
