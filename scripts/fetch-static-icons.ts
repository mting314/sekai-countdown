/**
 * Downloads static attribute icons, rarity stars, and the 5 SEKAI-variant Miku icons
 * from Sekai-World/sekai-viewer into public/assets/sekai/ so UI icons load locally.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW_VIEWER = 'https://raw.githubusercontent.com/Sekai-World/sekai-viewer/dev/src/assets';

const FILES: { url: string; dest: string }[] = [
  { url: `${RAW_VIEWER}/icon_attribute_cool.png`, dest: 'public/assets/sekai/attrs/cool.png' },
  { url: `${RAW_VIEWER}/icon_attribute_cute.png`, dest: 'public/assets/sekai/attrs/cute.png' },
  { url: `${RAW_VIEWER}/icon_attribute_pure.png`, dest: 'public/assets/sekai/attrs/pure.png' },
  { url: `${RAW_VIEWER}/icon_attribute_happy.png`, dest: 'public/assets/sekai/attrs/happy.png' },
  {
    url: `${RAW_VIEWER}/icon_attribute_mysterious.png`,
    dest: 'public/assets/sekai/attrs/mysterious.png'
  },
  { url: `${RAW_VIEWER}/rarity_star_normal.png`, dest: 'public/assets/sekai/rarity/normal.png' },
  {
    url: `${RAW_VIEWER}/rarity_star_afterTraining.png`,
    dest: 'public/assets/sekai/rarity/trained.png'
  },
  { url: `${RAW_VIEWER}/rarity_birthday.png`, dest: 'public/assets/sekai/rarity/birthday.png' },
  {
    url: `${RAW_VIEWER}/chara_icons/chr_ts_21_2.png`,
    dest: 'public/assets/sekai/chara_vs/21_leo_need.png'
  },
  {
    url: `${RAW_VIEWER}/chara_icons/chr_ts_21_3.png`,
    dest: 'public/assets/sekai/chara_vs/21_more_more_jump.png'
  },
  {
    url: `${RAW_VIEWER}/chara_icons/chr_ts_21_4.png`,
    dest: 'public/assets/sekai/chara_vs/21_vivid_bad_squad.png'
  },
  {
    url: `${RAW_VIEWER}/chara_icons/chr_ts_21_5.png`,
    dest: 'public/assets/sekai/chara_vs/21_wonderlands_showtime.png'
  },
  {
    url: `${RAW_VIEWER}/chara_icons/chr_ts_21_6.png`,
    dest: 'public/assets/sekai/chara_vs/21_nightcord.png'
  }
];

for (const item of FILES) {
  fs.mkdirSync(path.dirname(item.dest), { recursive: true });
  const res = await fetch(item.url);
  if (!res.ok) throw new Error(`Failed to fetch ${item.url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  fs.writeFileSync(item.dest, buf);
}

console.log(`Fetched ${FILES.length} static Sekai UI icons into public/assets/sekai/`);
