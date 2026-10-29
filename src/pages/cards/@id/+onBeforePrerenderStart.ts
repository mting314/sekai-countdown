import rawSnapshot from '../../../../data/sekai/snapshot.json';

export const onBeforePrerenderStart = () => {
  return rawSnapshot.cards
    .filter((c) => c.rarity === 'rarity_4' || c.rarity === 'rarity_birthday')
    .map((c) => `/cards/${c.id}`);
};
