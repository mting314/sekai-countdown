import rawSnapshot from '../../../../data/sekai/snapshot.json';

export const onBeforePrerenderStart = () => {
  return rawSnapshot.events.map((e) => `/events/${e.id}`);
};
