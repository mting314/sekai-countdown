import rawSnapshot from '../data/sekai/snapshot.json';

const charById = new Map(rawSnapshot.characters.map((c) => [c.id, c]));
const musicById = new Map(rawSnapshot.musics.map((m) => [m.id, m]));
const cardById = new Map(rawSnapshot.cards.map((c) => [c.id, c]));

const mmjEvents = rawSnapshot.events.filter(
  (e) => e.unit === 'more_more_jump' && e.eventType !== 'world_bloom'
);

console.log('=== MMJ FOCUS EVENTS: SONG VS vs 4★ VS CARD ===');
const songVsCounts: Record<string, number> = {};
const cardVsCounts: Record<string, number> = {};
const songVsLatest: Record<string, { ev: any; song: any; startAt: number }> = {};
let mismatchCount = 0;
let totalEventsWithBoth = 0;

for (const ev of mmjEvents) {
  // Find 4★ cards for this event
  const eventCards = ev.cardIds.map((id) => cardById.get(id)).filter(Boolean);
  const fourStarCards = eventCards.filter(
    (c) => c && c.rarity === 'rarity_4'
  );
  const vsCards = fourStarCards.filter((c) => c && c.characterId >= 21 && c.characterId <= 26);
  const vsCardChar = vsCards[0] ? charById.get(vsCards[0].characterId) : null;

  // Find commissioned song
  const song = ev.songId ? musicById.get(ev.songId) : null;
  let songVs: string[] = [];
  if (song) {
    const vsSingers = song.sekaiVocalCharacterIds.filter((id) => id >= 21 && id <= 26);
    songVs = vsSingers.map((id) => charById.get(id)?.nameEn ?? `VS#${id}`);
  }

  const hasVsInSong = songVs.length > 0;
  const hasVsInCard = vsCardChar !== null;
  const match = hasVsInCard && songVs.includes(vsCardChar?.nameEn ?? '');

  if (hasVsInCard && hasVsInSong) {
    totalEventsWithBoth++;
    if (!match) mismatchCount++;
  }

  const matchStr = !hasVsInCard
    ? 'NO 4★ VS CARD'
    : match
      ? '✓ MATCH'
      : `✗ MISMATCH (Song: ${songVs.join(', ')} vs Card: ${vsCardChar?.nameEn})`;

  console.log(
    `[${ev.nickname || 'ev' + ev.id}] ${ev.nameJa} (${new Date(ev.startAt).toISOString().slice(0, 10)})`
  );
  console.log(
    `   Song: ${song ? song.titleJa : 'None'} | VS Vocal: [${songVs.join(', ') || 'None'}] | 4★ VS Card: ${vsCardChar ? vsCardChar.nameEn : 'None'} -> ${matchStr}`
  );

  for (const v of songVs) {
    songVsCounts[v] = (songVsCounts[v] || 0) + 1;
    if (!songVsLatest[v] || ev.startAt > songVsLatest[v].startAt) {
      songVsLatest[v] = { ev, song, startAt: ev.startAt };
    }
  }
  if (vsCardChar) {
    cardVsCounts[vsCardChar.nameEn] = (cardVsCounts[vsCardChar.nameEn] || 0) + 1;
  }
}

console.log('\n=== SUMMARY FOR MMJ ===');
console.log(`Total MMJ focus events: ${mmjEvents.length}`);
console.log(
  `Events with both Song VS & 4★ VS Card: ${totalEventsWithBoth} (Mismatches: ${mismatchCount}, Matches: ${totalEventsWithBoth - mismatchCount})`
);
console.log('\nSong VS Vocal Counts:', songVsCounts);
console.log('4★ Card VS Counts:', cardVsCounts);

console.log('\n=== LATEST MMJ COMMISSIONED SONG PER VS ===');
const now = Date.now();
for (const [vs, info] of Object.entries(songVsLatest)) {
  const days = Math.floor((now - info.startAt) / (1000 * 60 * 60 * 24));
  console.log(
    `${vs.padEnd(14)}: ${days} days ago (${new Date(info.startAt).toISOString().slice(0, 10)}) in [${info.ev.nickname}] "${info.song.titleJa}"`
  );
}

// Check Virtual Singers with 0 songs in MMJ
const allVs = [
  'Miku Hatsune',
  'Rin Kagamine',
  'Len Kagamine',
  'Luka Megurine',
  'MEIKO',
  'KAITO'
];
for (const vs of allVs) {
  if (!songVsLatest[vs]) {
    console.log(`${vs.padEnd(14)}: NEVER sang in an MMJ commissioned song!`);
  }
}
console.log('\n========================================');
console.log('=== CROSS-UNIT COMPARISON (ALL UNITS) ===');
console.log('========================================');

const units = [
  'leo_need',
  'more_more_jump',
  'vivid_bad_squad',
  'wonderlands_showtime',
  'nightcord'
];

for (const unit of units) {
  const events = rawSnapshot.events.filter(
    (e) => e.unit === unit && e.eventType !== 'world_bloom'
  );
  let matches = 0;
  let mismatches = 0;
  let noCardWithSong = 0;
  const mismatchList: Array<{
    event: string;
    date: string;
    song: string;
    songVs: string;
    cardVs: string;
  }> = [];

  for (const ev of events) {
    const eventCards = ev.cardIds.map((id) => cardById.get(id)).filter(Boolean);
    const fourStarCards = eventCards.filter(
      (c) => c && c.rarity === 'rarity_4'
    );
    const vsCards = fourStarCards.filter(
      (c) => c && c.characterId >= 21 && c.characterId <= 26
    );
    const vsCardChar = vsCards[0] ? charById.get(vsCards[0].characterId) : null;

    const song = ev.songId ? musicById.get(ev.songId) : null;
    let songVs: string[] = [];
    if (song) {
      const vsSingers = song.sekaiVocalCharacterIds.filter((id) => id >= 21 && id <= 26);
      songVs = vsSingers.map((id) => charById.get(id)?.nameEn ?? `VS#${id}`);
    }

    if (song && songVs.length > 0) {
      if (vsCardChar) {
        if (songVs.includes(vsCardChar.nameEn)) {
          matches++;
        } else {
          mismatches++;
          mismatchList.push({
            event: ev.nickname || ev.nameJa,
            date: new Date(ev.startAt).toISOString().slice(0, 10),
            song: song.titleJa,
            songVs: songVs.join(', '),
            cardVs: vsCardChar.nameEn
          });
        }
      } else {
        noCardWithSong++;
      }
    }
  }

  console.log(`\n=== ${unit.toUpperCase()} ===`);
  console.log(
    `Events with 4★ VS Card: ${matches + mismatches} (Matches: ${matches}, Mismatches: ${mismatches}) | Events with Song VS but NO 4★ VS Card: ${noCardWithSong}`
  );
  if (mismatchList.length > 0) {
    console.log('Mismatches:');
    for (const m of mismatchList) {
      console.log(
        `  - [${m.event}] (${m.date}) Song: "${m.song}" (Sang by ${m.songVs}) vs 4★ Gacha Card: ${m.cardVs}`
      );
    }
  }
}
