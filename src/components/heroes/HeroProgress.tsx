type HeroProgressProps = {
  progress: number;
  language?: "de" | "en";
};

export function HeroProgress({ progress, language = "de" }: HeroProgressProps) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-bold text-amber-300">
      {progress} % {language === "en" ? "complete" : "fertig"}
    </div>
  );
}
