// A small rotating accent palette so each Custom Entity gets a distinct,
// stable identity color at a glance (like table icons in Notion/Airtable) —
// keyed off the entity's own id so it stays put across reloads and re-sorts.
export const ENTITY_ACCENTS = [
    { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
    { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
] as const;

export function entityAccent(id: number) {
    return ENTITY_ACCENTS[id % ENTITY_ACCENTS.length];
}
