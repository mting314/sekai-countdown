import { ALL_UNITS } from '~/utils/countdown/constants';

const SHORT_UNITS = ['ln', 'mmj', 'vbs', 'wxs', 'n25', 'vs'];

export const onBeforePrerenderStart = () => [
  ...ALL_UNITS.map((u) => `/units/${u}`),
  ...SHORT_UNITS.map((u) => `/units/${u}`)
];
