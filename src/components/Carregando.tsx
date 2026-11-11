/** Esqueleto mostrado enquanto a tela busca os dados. */
export default function Carregando({ blocos = 3 }: { blocos?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      {Array.from({ length: blocos }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
