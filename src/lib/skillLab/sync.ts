// 時刻・配置は説明用．32拍の旋律と輪唱の開始拍は公開READMEに基づく．
export const syncSlaves = [
  { id: 1, instrument: 'ピアノ', delay: 0, role: '輪唱1番' },
  { id: 2, instrument: 'トランペット', delay: 8, role: '輪唱2番' },
  { id: 3, instrument: '木琴', delay: 16, role: '輪唱3番' },
  { id: 4, instrument: 'キックドラム', delay: 0, role: 'リズム' },
  { id: 5, instrument: 'スネアドラム', delay: 0, role: 'リズム' },
] as const;
export const scoreBeats = 32;
export const missingBeatCount = 2;
export const syncPhaseStarts = [0, 4000, 8000, 12000] as const;
export const syncClockFrame = (time: number) => ({ phase: 0, time });

export function getSyncFrame(absoluteBeat: number, missingStart: number | null = null) {
  const beat = Number.isFinite(absoluteBeat) ? Math.max(0, absoluteBeat) : 0;
  const wholeBeat = Math.floor(beat);
  const fraction = beat - wholeBeat;
  const validMissing = missingStart !== null && Number.isFinite(missingStart) && missingStart >= 0;
  const missing = validMissing && wholeBeat >= missingStart && wholeBeat < missingStart + missingBeatCount;
  // 欠落中も内蔵時計の演奏位置は進む．受信拍だけ最後の値を保つ．
  const receivedBeat = missing ? Math.max(0, Math.ceil(missingStart) - 1) : wholeBeat;
  const recovered = validMissing && wholeBeat >= missingStart + missingBeatCount;
  return {
    wholeBeat, fraction, missing, receivedBeat, recovered,
    slaves: syncSlaves.map(slave => ({
      ...slave,
      playing: beat >= slave.delay,
      position: beat < slave.delay ? null : (beat - slave.delay) % scoreBeats,
      syncPosition: beat < slave.delay ? null : ((receivedBeat - slave.delay) % scoreBeats + scoreBeats) % scoreBeats,
      led: !missing && fraction < 0.24,
      playPulse: wholeBeat === slave.delay && fraction < 0.7,
    })),
  };
}
