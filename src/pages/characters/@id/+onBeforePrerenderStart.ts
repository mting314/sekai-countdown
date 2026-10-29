import { ALL_CHARACTER_IDS } from '~/utils/countdown/constants';

export const onBeforePrerenderStart = () => ALL_CHARACTER_IDS.map((id) => `/characters/${id}`);
