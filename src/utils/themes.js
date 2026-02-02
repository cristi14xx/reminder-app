export const THEMES = [
  { id: 'indigo', name: 'Indigo', emoji: '💎', accent: '#6366f1', accent2: '#a855f7', glow: 'rgba(99,102,241,0.25)' },
  { id: 'cyan', name: 'Cyan', emoji: '🌊', accent: '#06b6d4', accent2: '#22d3ee', glow: 'rgba(6,182,212,0.25)' },
  { id: 'emerald', name: 'Emerald', emoji: '🌲', accent: '#10b981', accent2: '#34d399', glow: 'rgba(16,185,129,0.25)' },
  { id: 'rose', name: 'Rose', emoji: '🌸', accent: '#f43f5e', accent2: '#fb7185', glow: 'rgba(244,63,94,0.25)' },
  { id: 'amber', name: 'Amber', emoji: '🔥', accent: '#f59e0b', accent2: '#fbbf24', glow: 'rgba(245,158,11,0.25)' },
  { id: 'violet', name: 'Violet', emoji: '🔮', accent: '#8b5cf6', accent2: '#c084fc', glow: 'rgba(139,92,246,0.25)' },
  { id: 'sky', name: 'Sky', emoji: '☁️', accent: '#0ea5e9', accent2: '#38bdf8', glow: 'rgba(14,165,233,0.25)' },
  { id: 'lime', name: 'Lime', emoji: '🍀', accent: '#84cc16', accent2: '#a3e635', glow: 'rgba(132,204,22,0.25)' },
];

export const getThemeById = (id) => THEMES.find(t => t.id === id) || THEMES[0];

export function applyTheme(id) {
  const t = getThemeById(id);
  const r = document.documentElement.style;
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-2', t.accent2);
  r.setProperty('--accent-glow', t.glow);
}
