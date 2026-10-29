import { join } from 'path-browserify';

export const routeHref = (path: string) => join(import.meta.env.BASE_URL, path);

export const homeHref = () => routeHref('/');
export const focusHref = () => routeHref('/focus');
export const cardsHref = () => routeHref('/cards');
export const virtualSingersHref = () => routeHref('/virtual-singers');
export const mixedAttrsHref = () => routeHref('/mixed-attrs');
export const extrasHref = () => routeHref('/extras');
export const characterHref = (id: number | string) => routeHref(`/characters/${id}`);
