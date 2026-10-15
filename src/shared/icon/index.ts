// Standard feature icons: approved 24×24 line fragments, copied verbatim; sujoodreal
// and horizon were redrawn to fill the 24×24 box like the others, so they read at 20px.
// Surfaces supply the SVG wrapper and stroke currentColor. Pure: no $.
export const FEATURE_ICONS = {
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  sujoodreal: '<circle cx="4.8" cy="17.9" r="2.4"/><path d="M7.4 15.9C9.6 10.6 12.5 6.4 15.8 6.4c1.9 0 2.8 1.4 2.8 3.6v10.8H22M9.3 13.5l1.8 4.9-3.2 2.4M2 20.8h20"/>',
  qpane: '<path d="M12 5v15M12 5C8.72 2.54 5.44 3 2.98 4v16c3.28-2 6.56-1 9.02 1 2.46-2 5.74-3 9.02-1V4c-2.46-1-5.74-2-9.02 1Z"/>',
  horizon: '<path d="M2 18h20M6 18a6 6 0 0112 0M12 4v3.5M4.9 8.9l2.2 2.2M19.1 8.9l-2.2 2.2M2.5 13.5H5M19 13.5h2.5M7 21.5h10"/>',
  spinbeads: '<circle cx="12" cy="3.8" r="2"/><circle cx="17.8" cy="6.2" r="1.75"/><circle cx="20.2" cy="12" r="1.5"/><circle cx="17.8" cy="17.8" r="1.25"/><circle cx="12" cy="20.2" r="1"/><circle cx="6.2" cy="17.8" r=".8"/><circle cx="3.8" cy="12" r=".6"/>',
  gearteeth: '<path d="M10.3 3h3.4l.5 2.3 1.6.7 2-1.3 2.4 2.4-1.3 2 .7 1.6 2.3.5v3.4l-2.3.5-.7 1.6 1.3 2-2.4 2.4-2-1.3-1.6.7-.5 2.3h-3.4l-.5-2.3-1.6-.7-2 1.3-2.4-2.4 1.3-2-.7-1.6L3 13.7v-3.4l2.3-.5.7-1.6-1.3-2 2.4-2.4 2 1.3 1.6-.7z"/><circle cx="12" cy="12" r="3"/>',
} as const satisfies Record<string, string>

export type FeatureIconKey = keyof typeof FEATURE_ICONS
