/* Ícones no traço dos SF Symbols (desenhados à mão, 24×24) */
import type { ComponentChildren, SVGAttributes } from 'preact'

type P = SVGAttributes<SVGSVGElement>

const S = (d: ComponentChildren) => (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...p}>
    {d}
  </svg>
)

export const ChevronRight = (p: P) => (
  <svg class="chevron" viewBox="0 0 8 13" aria-hidden="true" {...p}>
    <path d="M1.5 1.5 6.5 6.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)
export const ChevronLeft = S(<path d="M15 4.5 7.5 12l7.5 7.5" stroke-width="2.6" />)
export const Plus = S(<path d="M12 4.5v15M4.5 12h15" stroke-width="2.2" />)
export const Camera = S(
  <>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2h5.8l1.6 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
    <circle cx="12" cy="13" r="3.8" />
  </>,
)
export const Photo = S(
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m3.5 17 5-5 4 4 2.5-2.5 5.5 5" />
  </>,
)
export const Clipboard = S(
  <>
    <path d="M9 4.5H7A2 2 0 0 0 5 6.5v13A2 2 0 0 0 7 21.5h10a2 2 0 0 0 2-2v-13a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="3.2" rx="1.2" />
    <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
  </>,
)
export const Keyboard = S(
  <>
    <rect x="2.5" y="6" width="19" height="12.5" rx="2.5" />
    <path d="M6 10h.01M9.3 10h.01M12.6 10h.01M15.9 10h.01M18 10h.01M6 13.5h.01M18 13.5h.01M9 14.8h6" stroke-width="2.4" />
  </>,
)
export const XMark = S(<path d="M6 6l12 12M18 6 6 18" stroke-width="2.6" />)
export const Info = S(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6h.01" stroke-width="2.4" />
  </>,
)
export const Check = S(
  <>
    <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
    <path d="m8 12.3 2.8 2.8L16.2 9.5" stroke="#fff" stroke-width="2.2" />
  </>,
)
export const Warning = S(
  <>
    <path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13.2a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z" fill="currentColor" stroke="none" />
    <path d="M12 9v4.5M12 16.8h.01" stroke="#fff" stroke-width="2.2" />
  </>,
)
export const Trash = S(<path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7M6.5 6.5l.9 12.6a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.6M10 10.5v6.5M14 10.5v6.5" />)
export const Drop = S(<path d="M12 3.5S5.5 10.8 5.5 15a6.5 6.5 0 0 0 13 0c0-4.2-6.5-11.5-6.5-11.5z" />)
export const Share = S(<path d="M12 3.5v11M8 7.5l4-4 4 4M7 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1" />)
export const Ellipsis = S(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h.01M12 12h.01M16 12h.01" stroke-width="2.8" />
  </>,
)
