import { CHARACTER_NAMES, portraitUrl } from "@/components/stage/characterPresets";

/**
 * Choix du personnage, avant d'entrer en partie et depuis le lobby.
 *
 * La grille montre les portraits officiels, qui sont les rendus des modèles
 * 3D eux-mêmes : ce qu'on choisit ici est exactement ce qu'on verra sur le
 * plateau.
 *
 * `taken` sert dans le lobby, où l'on connaît déjà les autres candidats :
 * leurs personnages restent visibles mais ne sont plus sélectionnables, pour
 * qu'il n'y ait jamais deux fois la même silhouette sur le plateau.
 */
export function CharacterPicker({
  value,
  onChange,
  taken,
  className = "",
  compact = false,
}: {
  value: number;
  onChange: (index: number) => void;
  taken?: number[];
  className?: string;
  compact?: boolean;
}) {
  const takenSet = new Set(taken ?? []);

  return (
    <div className={className}>
      <div
        className="grid gap-2 overflow-y-auto scroll-hide pr-1"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 54 : 64}px, 1fr))`,
          maxHeight: compact ? 164 : 232,
        }}
      >
        {CHARACTER_NAMES.map((name, i) => {
          const selected = i === value;
          const unavailable = takenSet.has(i) && !selected;
          return (
            <button
              key={name}
              type="button"
              disabled={unavailable}
              onClick={() => onChange(i)}
              aria-label={`Personnage ${i + 1}`}
              aria-pressed={selected}
              className={`relative rounded-xl overflow-hidden aspect-square transition ${
                unavailable ? "cursor-not-allowed" : "hover:brightness-125 active:scale-95"
              }`}
              style={{
                border: `2px solid ${selected ? "#ff3d58" : "rgba(160,180,225,0.16)"}`,
                boxShadow: selected ? "0 0 18px rgba(227,18,47,0.6)" : "none",
                opacity: unavailable ? 0.28 : 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitUrl(i)}
                alt=""
                width={256}
                height={256}
                draggable={false}
                className="w-full h-full object-cover select-none"
                style={{ objectPosition: "50% 28%", transform: "scale(1.12)" }}
              />
              {unavailable && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[9px] uppercase tracking-wider text-steel font-semibold">
                  Pris
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Un personnage au hasard, pour ne pas proposer toujours le même par défaut. */
export function randomCharacter() {
  return Math.floor(Math.random() * CHARACTER_NAMES.length);
}
