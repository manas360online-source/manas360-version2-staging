import { useState } from 'react';

type VrCompanion = {
  id: 'phoenix' | 'dragon' | 'peacock';
  emoji: string;
  name: string;
  location: string;
  benefits: string;
  price: string;
  theme: 'butterfly' | 'himalaya' | 'sakura';
};

const companions: VrCompanion[] = [
  {
    id: 'phoenix',
    emoji: '🦋',
    name: 'Phoenix Friend',
    location: '🔥 Rebirth Temple',
    benefits: 'Transformation  Crisis Support',
    price: '₹299/mo',
    theme: 'butterfly',
  },
  {
    id: 'dragon',
    emoji: '🐉',
    name: 'Guardian Dragon',
    location: '⛰️ Crystal Cave',
    benefits: 'Protection  Voice Chat',
    price: '₹299/mo',
    theme: 'himalaya',
  },
  {
    id: 'peacock',
    emoji: '🦚',
    name: 'Wisdom Peacock',
    location: '🕉️ Lotus Garden',
    benefits: 'Vedic Wisdom  Self-Discovery',
    price: '₹299/mo',
    theme: 'sakura',
  },
];

export default function PetVrSanctuaryPage() {
  const [selected, setSelected] = useState<VrCompanion | null>(null);
  const [launching, setLaunching] = useState(false);

  return (
    <section className="mx-auto w-full max-w-[1180px] pb-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="rounded-[28px] border border-white/50 bg-gradient-to-br from-[#102136] via-[#1d2d45] to-[#2f466b] p-6 text-white shadow-[0_18px_42px_rgba(14,22,38,0.28)] sm:p-7 lg:p-8">
        <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
          VR Companion Sanctuary
        </p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Choose Your Premium VR Companion</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/80">
          Tap one of the three premium companions below. Once selected, launch will open the immersive experience.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {companions.map((companion) => {
          const active = selected?.id === companion.id;
          return (
            <button
              key={companion.id}
              type="button"
              onClick={() => setSelected(companion)}
              className={`overflow-hidden rounded-[20px] border text-left shadow-[0_12px_28px_rgba(23,41,61,0.12)] transition ${
                active ? 'border-[#7C3AED] bg-[#f7f3ff]' : 'border-white/40 bg-white/60 hover:border-[#c9b8f5]'
              }`}
            >
              <div className="bg-gradient-to-br from-[#2f244f]/95 via-[#4a3f74]/90 to-[#6759a6]/85 p-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{companion.name}</h2>
                  </div>
                  <span className="text-3xl" aria-hidden="true">{companion.emoji}</span>
                </div>
              </div>

              <div className="space-y-2 p-5 text-charcoal">
                <p className="text-sm font-semibold text-charcoal/80">{companion.location}</p>
                <p className="text-sm text-charcoal/75">{companion.benefits}</p>
                <p className="inline-flex rounded-full bg-[#efe7ff] px-3 py-1 text-xs font-semibold text-[#5f3fb6]">{companion.price}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-white/50 bg-white/65 p-5 shadow-[0_12px_30px_rgba(23,41,61,0.10)]">
        {!selected ? (
          <p className="text-sm text-charcoal/70">Select a companion card to continue. After selection, click launch.</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-charcoal/65">Selected Companion</p>
              <p className="text-lg font-bold text-charcoal">{selected.emoji} {selected.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setLaunching(true)}
              className="inline-flex items-center justify-center rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
            >
              Launch Experience
            </button>
          </div>
        )}
      </div>

      {launching && selected && (
        <div className="fixed inset-0 z-[80] bg-black/80">
          <button
            type="button"
            onClick={() => setLaunching(false)}
            className="absolute right-4 top-4 z-[90] rounded-full border border-white/40 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Close
          </button>
          <iframe
            title={`${selected.name} launch`}
            src={`/ar-butterfly-garden.html?theme=${selected.theme}`}
            className="h-full w-full border-0"
            allow="camera; microphone; autoplay; fullscreen"
          />
        </div>
      )}
    </section>
  );
}
