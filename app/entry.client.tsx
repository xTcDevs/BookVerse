import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { HYDRATED_EVENT, parkHostInjectedNodes } from './lib/host-injections';

// React Router's default client entry, plus setting aside nodes the host adds
// to the HTML (see host-injections.ts) until React has hydrated.
const restore = parkHostInjectedNodes();
window.addEventListener(HYDRATED_EVENT, restore, { once: true });

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
