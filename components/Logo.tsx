import { motion } from "framer-motion";

export function Logo({ size = "lg", animated = true }: { size?: "sm" | "md" | "lg" | "xl"; animated?: boolean }) {
  const sizes = {
    sm: "text-3xl md:text-4xl",
    md: "text-5xl md:text-6xl",
    lg: "text-6xl md:text-8xl",
    xl: "text-7xl md:text-[9rem]",
  };

  return (
    <motion.div
      className="relative inline-block text-center"
      initial={animated ? { opacity: 0, scale: 0.85, filter: "blur(10px)" } : undefined}
      animate={animated ? { opacity: 1, scale: 1, filter: "blur(0px)" } : undefined}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-0 blur-3xl bg-blood/40 rounded-full"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <h1
        className={`relative font-display ${sizes[size]} leading-none text-white uppercase tracking-wide`}
        style={{ textShadow: "0 0 40px rgba(227,18,47,0.65), 0 0 90px rgba(227,18,47,0.3)" }}
      >
        QUI VA
        <br />
        <span className="text-blood">TOMBER&nbsp;?</span>
      </h1>
    </motion.div>
  );
}
