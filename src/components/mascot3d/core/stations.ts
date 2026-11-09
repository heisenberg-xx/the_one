import type { Station } from "./director";

/**
 * Default stations, read from markers in the page:
 *   [data-mascot-spot="hero"]        the RAJESH word (he sleeps on its top edge)
 *   [data-mascot-spot="about"]       About text block (he hangs beside its right edge)
 *   [data-mascot-spot="experience"]  the timeline bar (he crawls along its underside)
 *   [data-mascot-spot="skills"]      one skill card (he cooks on top of it)
 *   [data-mascot-spot="projects"]    the Works project grid (he stands on its top edge;
 *                                    this portfolio's Works section has no heading)
 * The section a spot lives in decides when the visitor has reached it.
 */
/** First matching element that is actually rendered (desktop and mobile markup can both carry a marker). */
const q = (sel: string) => () =>
  Array.from(document.querySelectorAll(sel)).find((el) => el.getClientRects().length > 0) ?? null;
const clampX = (x: number) => Math.max(60, Math.min(window.innerWidth - 60, x));

export function defaultStations(): Station[] {
  return [
    {
      id: "hero", spot: q('[data-mascot-spot="hero"]'), outfit: "default", act: "sleep", facing: 90,
      // caps start a little below the line box
      ground: (r) => ({ x: r.left + r.width * 0.5, y: r.top + r.height * 0.14 }),
    },
    {
      id: "about", spot: q('[data-mascot-spot="about"]'), outfit: "vigilante", act: "hang", facing: 30,
      ground: (r) => ({ x: clampX(r.right + 40), y: r.top + r.height * 0.62 }),
      line: (r, s) => ({ x: clampX(r.right + 40), y: Math.max(s.top + 2, -40) }),
    },
    {
      id: "experience", spot: q('[data-mascot-spot="experience"]'), outfit: "vigilante", act: "crawl", facing: 90,
      inverted: true, patrol: true,
      ground: (r) => ({ x: r.left + r.width / 2, y: r.bottom }),
    },
    {
      id: "skills", spot: q('[data-mascot-spot="skills"]'), outfit: "chemist", act: "cook", facing: 25,
      // right end of the icon dock, clear of the centred "What I build with," heading
      ground: (r) => ({ x: r.left + r.width * 0.86, y: r.top }),
    },
    {
      id: "projects", spot: q('[data-mascot-spot="projects"]'), outfit: "fedora", act: "proud", facing: 0,
      ground: (r) => ({ x: r.left + r.width * 0.5, y: r.top }),
    },
  ];
}
