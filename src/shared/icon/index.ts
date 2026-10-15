// Standard feature icons: approved 24×24 line fragments, copied verbatim.
// Surfaces supply the SVG wrapper and stroke currentColor. Pure: no $.
export const FEATURE_ICONS = {
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  sujoodreal: '<circle cx="5.2" cy="17.8" r="1.9"/><path d="M7 15.8C9.5 11.5 12.5 9.5 15.5 9.5c2 0 3 1.5 3 4v5H21M9.5 14.2l1.5 3.6-3 2.2M2.5 20.2h19"/>',
  qpane: '<path d="M12 5v15M12 5C8.72 2.54 5.44 3 2.98 4v16c3.28-2 6.56-1 9.02 1 2.46-2 5.74-3 9.02-1V4c-2.46-1-5.74-2-9.02 1Z"/>',
  horizon: '<path d="M3 19h18M6.5 19a5.5 5.5 0 0111 0M12 7v3M4.6 11.6l1.5 1.5M19.4 11.6l-1.5 1.5M9.8 5.2L12 3l2.2 2.2"/>',
  spinbeads: '<circle cx="12" cy="3.8" r="2"/><circle cx="17.8" cy="6.2" r="1.75"/><circle cx="20.2" cy="12" r="1.5"/><circle cx="17.8" cy="17.8" r="1.25"/><circle cx="12" cy="20.2" r="1"/><circle cx="6.2" cy="17.8" r=".8"/><circle cx="3.8" cy="12" r=".6"/>',
  gearteeth: '<path d="M10.3 3h3.4l.5 2.3 1.6.7 2-1.3 2.4 2.4-1.3 2 .7 1.6 2.3.5v3.4l-2.3.5-.7 1.6 1.3 2-2.4 2.4-2-1.3-1.6.7-.5 2.3h-3.4l-.5-2.3-1.6-.7-2 1.3-2.4-2.4 1.3-2-.7-1.6L3 13.7v-3.4l2.3-.5.7-1.6-1.3-2 2.4-2.4 2 1.3 1.6-.7z"/><circle cx="12" cy="12" r="3"/>',
} as const satisfies Record<string, string>

export type FeatureIconKey = keyof typeof FEATURE_ICONS
