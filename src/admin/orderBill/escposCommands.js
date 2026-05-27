/** Minimal ESC/POS command helpers for 80mm thermal printers */

export const ESC = "\x1b";
export const GS = "\x1d";

export function escInit() {
  return ESC + "@";
}

/** 0=left, 1=center, 2=right */
export function escAlign(mode) {
  return ESC + "a" + String.fromCharCode(mode);
}

export function escBold(on) {
  return ESC + "E" + String.fromCharCode(on ? 1 : 0);
}

export function escFeed(lines = 3) {
  return ESC + "d" + String.fromCharCode(Math.min(255, Math.max(0, lines)));
}

/** Partial cut */
export function escCut() {
  return GS + "V" + "\x41" + "\x03";
}
