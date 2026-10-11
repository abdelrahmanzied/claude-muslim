// The band's look on desktop: the athkar lab's own rules, in the lab's order,
// the ones its band uses in every sky, Frame, color and state.

export const BAND_CSS = `
* {box-sizing: border-box;}
button:focus-visible {outline: 2px solid var(--accent); outline-offset: 2px;}
.band {position: relative; border-radius: 12px; cursor: pointer; user-select: none; -webkit-user-select: none; outline: none; color: var(--desk-ink); --b-ink: var(--desk-ink); --b-dim: var(--desk-dim); --b-acc: var(--claude); --b-soft: var(--claude-soft); --b-faint: var(--claude-faint); --b-track: var(--desk-line);}
.band {--ring: var(--claude);}
.band {transition: filter .7s ease, box-shadow .4s ease;}
.band.al-fade:not(.active) {filter: saturate(.3) brightness(1.03) contrast(.94);}
.band.al-fade:not(.active):hover {filter: saturate(.75);}
.acc-green {--ring: var(--green); --b-acc: var(--green); --b-soft: var(--green-soft); --b-faint: var(--green-faint);}
.acc-gold {--ring: var(--gold); --b-acc: var(--gold); --b-soft: var(--gold-soft); --b-faint: var(--gold-faint);}
.acc-blue {--ring: var(--blue); --b-acc: var(--blue); --b-soft: var(--blue-soft); --b-faint: var(--blue-faint);}
.band .text {font-family: var(--font-band, var(--font-ar)); direction: rtl; text-align: right; white-space: pre-line; color: var(--b-ink);}
.band .hint {font-size: 11.5px; color: var(--b-dim);}
.band .x {border: 0; background: none; color: var(--b-dim); cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1;}
.band .src {font-size: 11.5px; color: var(--b-dim); direction: rtl;}
.band.active .state {color: var(--b-acc);}
.band {outline: none !important; transition: box-shadow .4s ease;}
.band.active.al-breathe {animation: breathe 5.5s ease-in-out infinite;}
.xabs {position: absolute; top: 4px; left: 6px; z-index: 4; opacity: .55; font-size: 17px; transition: opacity .2s, color .2s, transform .2s;}
.band.active .xabs {font-weight: 700;}
.xabs:hover {opacity: 1;}
.band[data-band] .text {font-size: var(--band-size, 16px) !important;}
.bg-frame {background: transparent; border: 1.5px solid var(--b-acc);}
.bg-bluehour {background: var(--scrim), radial-gradient(130% 70% at 50% 130%, rgba(255, 190, 140, .55), rgba(255, 190, 140, 0) 62%), linear-gradient(180deg, #0b1636 0%, #1d336c 46%, #3c5ba2 80%, #7c90c6 100%);}
.bg-rose {background: var(--scrim), radial-gradient(1.5px 1.5px at 76% 20%, #fff, transparent 60%), linear-gradient(180deg, #29225a 0%, #574285 38%, #a96f98 74%, #eeb19c 100%);}
.bg-crescent {background: var(--scrim), radial-gradient(1.5px 1.5px at 62% 24%, #fff, transparent 60%), radial-gradient(1px 1px at 38% 62%, rgba(255,255,255,.7), transparent 60%), radial-gradient(1px 1px at 84% 70%, rgba(255,255,255,.6), transparent 60%), radial-gradient(60px 60px at 9% 18%, rgba(255, 236, 190, .28), transparent 70%), linear-gradient(180deg, #060c22 0%, #121d48 58%, #26346a 100%);}
.bg-crescent::before {content: "☾"; position: absolute; left: 34px; top: 5px; font-size: 15px; color: #ffe9b8; text-shadow: 0 0 10px rgba(255, 225, 160, .7); opacity: .55; pointer-events: none;}
.pglow {position: absolute; left: 16px; right: 16px; bottom: 4px; height: 2px; border-radius: 2px; pointer-events: none; z-index: 3; background: color-mix(in srgb, var(--b-ink) 12%, transparent);}
.pglow b {position: absolute; right: 0; top: 0; bottom: 0; border-radius: 2px; background: linear-gradient(to left, color-mix(in srgb, var(--ring) 25%, transparent), var(--ring) 85%); box-shadow: 0 0 6px 0 color-mix(in srgb, var(--ring) 55%, transparent); transition: width .7s cubic-bezier(.2, .8, .2, 1);}
.pglow b::after {content: ""; position: absolute; left: -5px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: radial-gradient(circle, #fff 0 22%, var(--ring) 55%, transparent 72%); box-shadow: 0 0 10px 2px color-mix(in srgb, var(--ring) 50%, transparent); animation: pgPulse 2.6s ease-in-out infinite;}
.pglow.full b {background: var(--ring);}
.pglow.full b::after {display: none;}
@media (prefers-reduced-motion: reduce) { .pglow b {transition: none;} }
@media (prefers-reduced-motion: reduce) { .pglow b::after {animation: none;} }
.band .src {font-family: var(--font-band);}
.band.sky::before, .band.sky::after {animation-delay: var(--t, 0s) !important;}
.fx {position: absolute; inset: 0; border-radius: inherit; overflow: hidden; pointer-events: none; z-index: -1;}
.fx i {position: absolute; display: block; animation-delay: calc(var(--t, 0s) + var(--d, 0s)); will-change: transform, opacity;}
.fx .st {border-radius: 50%; background: #fff; box-shadow: 0 0 4px rgba(255,255,255,.9); animation: fxTw var(--dur) ease-in-out infinite alternate; animation-delay: calc(var(--t, 0s) + var(--d, 0s));}
.fx .sh {top: 8%; left: 78%; width: 64px; height: 1.5px; border-radius: 2px; background: linear-gradient(90deg, rgba(255,255,255,0), #fff); opacity: 0; animation: fxShoot var(--dur) cubic-bezier(.3,.1,.3,1) infinite; animation-delay: calc(var(--t, 0s) + var(--d, 0s));}
.fx .hz {left: -10%; right: -10%; bottom: -30%; height: 70%; border-radius: 50%; animation: fxBreathe 7s ease-in-out infinite alternate; animation-delay: var(--t, 0s);}
.fx .hz.dawn {background: radial-gradient(closest-side, rgba(255, 186, 150, .55), rgba(255, 186, 150, 0));}
.fx .hz.blue {background: radial-gradient(closest-side, rgba(255, 196, 150, .45), rgba(255, 196, 150, 0));}
.fx .sun {width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle, rgba(255,253,240,.8) 0, rgba(255,224,143,.55) 16px, rgba(255,196,110,.3) 28px, rgba(255,176,98,0) 45px); filter: blur(1.5px);}
.fx .sun.up {right: 5%; bottom: -40px; animation: fxSunUp 16s ease-in-out infinite alternate; animation-delay: var(--t, 0s);}
.fx .sun.down {left: 10%; bottom: -38px; background: radial-gradient(circle, rgba(255,236,204,.55) 0, rgba(255,185,138,.38) 16px, rgba(255,150,120,.2) 28px, rgba(255,150,120,0) 45px); filter: blur(2px); animation: fxSunDown 18s ease-in-out infinite alternate; animation-delay: var(--t, 0s);}
.fx .cl {left: 0; width: 110px; height: 28px; background: radial-gradient(ellipse 40% 50% at 32% 60%, rgba(255,255,255,.9), transparent 70%), radial-gradient(ellipse 34% 60% at 58% 44%, rgba(255,255,255,.85), transparent 70%), radial-gradient(ellipse 30% 40% at 78% 64%, rgba(255,255,255,.8), transparent 70%); filter: blur(.6px); animation: fxDrift var(--dur) linear infinite; animation-delay: calc(var(--t, 0s) + var(--d, 0s));}
.fx .haze {left: 0; width: 70%; height: 9px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 210, 220, .5), rgba(255, 210, 220, 0)); animation: fxDrift var(--dur) linear infinite; animation-delay: calc(var(--t, 0s) + var(--d, 0s));}
.fx .bd {left: 0; width: 16px; height: 7px; animation: fxDrift var(--dur) linear infinite; animation-delay: calc(var(--t, 0s) + var(--d, 0s));}
.fx .bd b, .fx .bd::before {content: ""; position: absolute; top: 0; width: 8px; height: 6px; border-top: 1.6px solid rgba(40, 44, 70, .75); border-radius: 50% 50% 0 0; animation: fxFlap .7s ease-in-out infinite alternate;}
.fx .bd::before {left: 0;}
.fx .bd b {left: 6px;}
.fx .rays {right: -40px; top: -60px; width: 150px; height: 150px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255, 252, 230, .14) 0 6deg, rgba(255, 252, 230, 0) 6deg 18deg); -webkit-mask: radial-gradient(closest-side, #000 30%, transparent 100%); mask: radial-gradient(closest-side, #000 30%, transparent 100%); animation: fxSpin 60s linear infinite; animation-delay: var(--t, 0s);}
.band.fx-rich.bg-crescent::before {animation: moonGlow 4s ease-in-out infinite alternate, fxFloat 7s ease-in-out infinite alternate;}
@media (prefers-reduced-motion: reduce) { .fx i, .fx i::before {animation: none !important;} }
.band.sky.nm-main.dark-ink .cover :not(.cover-title) {color: var(--ring);}
.band.sky.nm-main.dark-ink .cover .kc {border-color: color-mix(in srgb, var(--ring) 50%, transparent); background: color-mix(in srgb, var(--ring) 10%, transparent);}
.band.sky {isolation: isolate;}
.band.bg-dawn::after {content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1;}
.band.bg-dawn::after {animation: twinkle 3.2s ease-in-out infinite alternate;}
.band.bg-dawn::after {background: radial-gradient(1.5px 1.5px at 34% 30%, #fff, transparent 60%), radial-gradient(1px 1px at 66% 16%, #fff, transparent 60%), radial-gradient(1.5px 1.5px at 88% 40%, rgba(255,255,255,.9), transparent 60%), radial-gradient(1px 1px at 8% 44%, #fff, transparent 60%);}
.band.bg-rose::after {background: radial-gradient(1px 1px at 22% 18%, #fff, transparent 60%), radial-gradient(1.5px 1.5px at 48% 30%, rgba(255,255,255,.9), transparent 60%), radial-gradient(1px 1px at 92% 14%, #fff, transparent 60%), radial-gradient(ellipse 60px 7px at var(--cx) 58%, rgba(255, 214, 220, .35), transparent 70%); animation: twinkle 3.2s ease-in-out infinite alternate, drift 22s linear infinite;}
.band.bg-bluehour::after {background: radial-gradient(1px 1px at 14% 22%, #fff, transparent 60%), radial-gradient(1.5px 1.5px at 40% 12%, #fff, transparent 60%), radial-gradient(1px 1px at 70% 30%, rgba(255,255,255,.85), transparent 60%), radial-gradient(1.5px 1.5px at 90% 18%, #fff, transparent 60%), radial-gradient(1px 1px at 56% 46%, rgba(255,255,255,.7), transparent 60%);}
.band.bg-bluehour::before {background: radial-gradient(120% 60% at 50% 125%, rgba(255, 190, 140, .45), transparent 65%); animation: breatheGlow 5s ease-in-out infinite alternate;}
.band.bg-crescent::after {background: radial-gradient(1.5px 1.5px at 24% 30%, #fff, transparent 60%), radial-gradient(1px 1px at 50% 14%, #fff, transparent 60%), radial-gradient(1.5px 1.5px at 74% 40%, rgba(255,255,255,.9), transparent 60%), radial-gradient(1px 1px at 94% 22%, #fff, transparent 60%); animation-duration: 2.6s;}
.band.bg-crescent::before {animation: moonGlow 4s ease-in-out infinite alternate;}
.band.bg-sunrise::before {background: radial-gradient(circle at 86% var(--sy), rgba(255, 246, 214, .5) 0, rgba(255, 215, 136, .3) 22px, rgba(255, 176, 98, 0) 70px); animation: sunUp 9s ease-in-out infinite alternate;}
.band.bg-sunrise::after {background: radial-gradient(ellipse 46px 10px at var(--cx) 30%, rgba(255,255,255,.6), transparent 70%), radial-gradient(ellipse 34px 8px at calc(var(--cx) + 38%) 70%, rgba(255,255,255,.45), transparent 70%); animation: drift 18s linear infinite;}
.band.bg-day::after {animation-duration: 24s;}
.band.bg-day::before {background: radial-gradient(circle at 93% -6%, rgba(255,255,255,.3) 0, rgba(255,248,214,0) 80px); animation: breatheGlow 4s ease-in-out infinite alternate;}
@media (prefers-reduced-motion: reduce) { .band.sky::before, .band.sky::after {animation: none !important;} }
.sky {--b-track: rgba(255,255,255,.32); border: 1px solid rgba(255,255,255,.22);}
.sky.light-ink {--scrim: linear-gradient(rgba(8, 12, 30, .30), rgba(8, 12, 30, .30)); --b-ink: #ffffff; --b-dim: rgba(255,255,255,.82); --b-acc: #ffffff; --b-soft: rgba(255,255,255,.35); --b-on: #2a2440;}
.cover {display: grid; gap: 8px; justify-items: center; text-align: center; padding: 10px 8px;}
.cover-title {font-family: var(--font-cover, "Aref Ruqaa", serif); font-size: 30px; line-height: 1.5; color: var(--b-acc); direction: rtl;}
.cover-keys {display: grid; grid-template-columns: repeat(2, max-content); justify-content: center; justify-items: start; align-items: center; gap: 7px 28px; font: 500 10.5px/1 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; color: var(--b-dim);}
.cover-keys .kc {height: 17px; min-width: 17px; padding: 0 5px; font: 500 9.5px/1 var(--font-ui); letter-spacing: .03em; color: var(--b-ink); border: 1px solid color-mix(in srgb, var(--b-ink) 28%, transparent); border-radius: 5px; background: color-mix(in srgb, var(--b-ink) 7%, transparent); opacity: 1;}
.cover-keys span {display: inline-flex; gap: 3px; align-items: center; line-height: 17px;}
.cover-keys span > .kc:last-of-type {margin-inline-end: 3px;}
.cover-go {font: inherit; color: var(--b-ink);}
.kc.kc-mouse {padding: 0 4px;}
.kc.kc-mouse svg {display: block;}
.cover {grid-column: 1 / -1; container-type: inline-size;}
.cover > * {min-width: 0;}
.cv-inline {grid-template-columns: max-content minmax(0, auto); justify-content: space-between; justify-items: stretch; align-items: center; direction: rtl; text-align: start; gap: 8px 20px; padding: 4px 4px;}
.cv-inline .cover-title {font-size: 26px; line-height: 1.3;}
.cover-title {white-space: nowrap;}
.cv-inline .cover-keys {direction: ltr; grid-template-columns: repeat(2, max-content); justify-content: end; gap: 7px 16px;}
.sky.dark-ink {--scrim: linear-gradient(rgba(255, 255, 255, .34), rgba(255, 255, 255, .34)); --b-ink: #141a2a; --b-dim: #3f4a63; --b-acc: var(--ring); --b-soft: color-mix(in srgb, var(--ring) 25%, transparent); --b-on: #ffffff; --b-track: rgba(28,34,51,.18);}
.bg-dawn {background: var(--scrim), radial-gradient(1px 1px at 18% 20%, #fff, transparent 60%), radial-gradient(1px 1px at 52% 12%, #fff, transparent 60%), radial-gradient(1px 1px at 76% 28%, rgba(255,255,255,.7), transparent 60%), linear-gradient(180deg, #1f2c58 0%, #4f4a82 40%, #c4778a 78%, #f3b38f 100%);}
.bg-sunrise {background: var(--scrim), radial-gradient(circle at 86% 112%, rgba(255,246,214,.75) 0, rgba(255,215,136,.55) 26px, rgba(255,176,98,.35) 64px, rgba(255,176,98,0) 150px), linear-gradient(180deg, #86b6e6 0%, #bcd2ea 42%, #f6d0a6 82%, #f4ac72 100%);}
.bg-day {background: var(--scrim), radial-gradient(circle at 93% -6%, rgba(255,255,255,.7) 0, rgba(255,248,214,.45) 26px, rgba(255,248,214,0) 110px), radial-gradient(60% 50% at 20% 85%, rgba(255,255,255,.25), transparent 70%), linear-gradient(180deg, #2f7fd6 0%, #5ea6ec 58%, #a6d0f6 100%);}
.band.edge:not(.framed) {border-color: var(--ring) !important;}
.band.sky.edge:not(.framed) {border-color: color-mix(in srgb, var(--b-edge, var(--ring)) 55%, rgba(255,255,255,.3)) !important; border-width: 1px;}
.band.line {padding: 10px 14px; display: grid; grid-template-columns: auto minmax(0,1fr); gap: 4px 14px; align-items: center;}
.band.line .text {font-size: 15px; line-height: 1.9; grid-column: 2; grid-row: 1; max-height: 5.7em; overflow-y: auto;}
.band.card {padding: 12px 16px; display: grid; gap: 10px;}
.done-row {display: flex; justify-content: space-between; align-items: center; gap: 12px; direction: rtl; flex-wrap: nowrap; min-width: 0;}
.done-row .done-hint {direction: ltr; font-family: var(--font-mono); flex: none; white-space: nowrap; font-size: 11.5px;}
.done-row .big {font-family: var(--font-band, var(--font-ar)); font-size: var(--ds, 19px); color: var(--b-ink); white-space: nowrap; flex: none;}
.done-row .cite, .rise-msg .cite {font-size: .7em; color: var(--b-dim); margin-inline-start: 6px; text-shadow: none;}
.fx {position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 5;}
.kc {display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border: 1px solid var(--b-dim); border-bottom-width: 2px; border-radius: 4px; font: 500 9.5px/1 var(--font-mono); color: var(--b-dim); opacity: .85;}
.keys {display: inline-flex; gap: 4px; align-items: center; font: 500 10.5px var(--font-mono); color: var(--b-dim);}
:root[data-theme="dark"] .band.fc-white {--fill-ink: var(--b-edge, var(--ring));}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .band.fc-white {--fill-ink: var(--b-edge, var(--ring));} }
.band.line.compact {grid-template-columns: minmax(0, 1fr);}
.band.line.compact .text {grid-column: 1; grid-row: auto;}
@media (max-width: 640px) { .band.line {grid-template-columns: minmax(0,1fr);} }
@media (max-width: 640px) { .band.line .text {grid-column: 1; grid-row: auto;} }
@media (prefers-reduced-motion: reduce) { * {transition: none !important;} }
@keyframes breathe { 0%, 100% { box-shadow: 0 0 10px 0 color-mix(in srgb, var(--ring) 16%, transparent); } 50% { box-shadow: 0 0 20px 2px color-mix(in srgb, var(--ring) 32%, transparent); } }
@keyframes pgPulse { 0%, 100% { transform: scale(.85); opacity: .8; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes fxBreathe { from { opacity: .35; transform: translateY(6px) scaleX(.96); } to { opacity: 1; transform: translateY(0) scaleX(1.04); } }
@keyframes fxSunUp { from { transform: translate(0, 26px); } to { transform: translate(-34px, -30px); } }
@keyframes fxSunDown { from { transform: translate(0, -18px); } to { transform: translate(24px, 22px); } }
@keyframes fxFlap { from { transform: scaleY(1); } to { transform: scaleY(.35) translateY(2px); } }
@keyframes fxSpin { to { transform: rotate(360deg); } }
@keyframes fxFloat { from { transform: translateY(-2px); } to { transform: translateY(2px); } }
@keyframes twinkle { 0% { opacity: .25; } 50% { opacity: 1; } 100% { opacity: .45; } }
@keyframes drift { from { --cx: -30%; } to { --cx: 110%; } }
@keyframes sunUp { from { --sy: 135%; } to { --sy: 96%; } }
@keyframes breatheGlow { from { opacity: .45; } to { opacity: 1; } }
@keyframes moonGlow { from { opacity: .4; text-shadow: 0 0 6px rgba(255, 225, 160, .5); } to { opacity: .8; text-shadow: 0 0 16px rgba(255, 225, 160, .95); } }
@keyframes fxTw { from { opacity: .12; transform: scale(.6); } to { opacity: 1; transform: scale(1.25); } }
@keyframes fxShoot { 0% { opacity: 0; transform: translate(0, 0) rotate(167deg); } 3% { opacity: 1; } 11% { opacity: 0; transform: translate(-240px, 56px) rotate(167deg); } 100% { opacity: 0; transform: translate(-240px, 56px) rotate(167deg); } }
@keyframes fxDrift { from { left: -120px; transform: scale(var(--sc, 1)); } to { left: 105%; transform: scale(var(--sc, 1)); } }
@property --ang {syntax: '<angle>'; initial-value: 0deg; inherits: false;}
@property --cx {syntax: '<percentage>'; initial-value: -30%; inherits: false;}
@property --sy {syntax: '<percentage>'; initial-value: 130%; inherits: false;}
`
