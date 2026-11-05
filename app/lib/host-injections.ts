// Hosting platforms edit pre-rendered HTML after the build. Netlify (free tier)
// adds a promotional comment plus line breaks in <head>, a toolbar script after
// </html>, and a badge iframe that script creates. React hydrates the whole
// document, sees nodes it didn't render, and throws #418, then re-renders the
// page from scratch. So: set those nodes aside, hydrate, then put them back.

export const HYDRATED_EVENT = 'bookverse:hydrated';

type Parked = { node: Node; parent: Node; next: Node | null };

function isHostInjected(node: Node, parent: Node): boolean {
  if (node.nodeType === Node.COMMENT_NODE) return /hosted on Netlify/i.test(node.nodeValue ?? '');
  // React renders no whitespace-only text directly inside <html> or <head>.
  if (node.nodeType === Node.TEXT_NODE) return parent !== document.body && !(node.nodeValue ?? '').trim();
  if (node instanceof HTMLScriptElement) return /\/\.netlify\//.test(node.getAttribute('src') ?? '');
  if (node instanceof HTMLIFrameElement) return node.id === 'nl-badge-frame';
  return false;
}

/** Detach host-injected nodes; returns a function that restores them in place. */
export function parkHostInjectedNodes(doc: Document = document): () => void {
  const parked: Parked[] = [];
  for (const parent of [doc.documentElement, doc.head, doc.body]) {
    if (!parent) continue;
    for (const node of Array.from(parent.childNodes)) {
      if (isHostInjected(node, parent)) {
        parked.push({ node, parent, next: node.nextSibling });
        node.remove();
      }
    }
  }
  return () => {
    for (const { node, parent } of parked) {
      // Re-add at the end of its parent: React no longer compares the DOM after
      // hydration, and Netlify's toolbar and badge keep working as before.
      // (A script element that already started loading does not run twice.)
      if (!node.isConnected) (parent === doc.documentElement ? doc.body : parent).appendChild(node);
    }
  };
}
