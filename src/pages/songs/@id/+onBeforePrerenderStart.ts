import rawSnapshot from '../../../../data/sekai/snapshot.json';

export const onBeforePrerenderStart = () => {
  return rawSnapshot.musics.map((m) => `/songs/${m.id}`);
};
