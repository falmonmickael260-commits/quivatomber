import { motion } from "framer-motion";

/**
 * Le logo du jeu. C'est l'image officielle (`public/logo-qvt.png`, fond
 * transparent), pas une reconstitution typographique : c'est elle qu'on
 * retrouve aussi sur le mur du plateau, pour que l'accueil et l'émission
 * portent la même marque.
 *
 * Le halo derrière est en CSS, pas dans l'image : il s'adapte au fond de
 * chaque écran sans détourer un rectangle clair.
 */
export function Logo({
  size = "lg",
  animated = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}) {
  // largeurs en viewport, bornées : le logo doit rester lisible du
  // téléphone au grand écran sans jamais déborder
  const widths = {
    sm: "clamp(170px, 34vw, 260px)",
    md: "clamp(230px, 46vw, 380px)",
    lg: "clamp(280px, 62vw, 540px)",
    xl: "clamp(320px, 76vw, 720px)",
  };

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      style={{ width: widths[size] }}
      initial={animated ? { opacity: 0, scale: 0.88, filter: "blur(10px)" } : undefined}
      animate={animated ? { opacity: 1, scale: 1, filter: "blur(0px)" } : undefined}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: "120%",
          height: "120%",
          background:
            "radial-gradient(ellipse at center, rgba(212,175,55,0.3), rgba(227,18,47,0.16) 45%, transparent 72%)",
          filter: "blur(26px)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-qvt.png"
        alt="QUI VA TOMBER ?"
        width={1200}
        height={800}
        draggable={false}
        className="relative w-full h-auto select-none"
      />
    </motion.div>
  );
}
