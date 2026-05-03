import { MapZone, MapItem } from './types';

export const ZONES: MapZone[] = [
  { id: 'torre_norte', name: 'Torre Norte', x: 16, y: 14 },
  { id: 'gran_comedor', name: 'Gran Comedor', x: 49, y: 20 },
  { id: 'biblioteca', name: 'Biblioteca', x: 77, y: 18 },
  { id: 'mazmorras', name: 'Mazmorras', x: 24, y: 72 },
  { id: 'bano_embrujado', name: 'Baño Embrujado', x: 52, y: 62 },
  { id: 'campo_quidditch', name: 'Campo de Quidditch', x: 82, y: 72 },
  { id: 'bosque_prohibido', name: 'Bosque Prohibido', x: 13, y: 43 },
  { id: 'aula_pociones', name: 'Aula de Pociones', x: 63, y: 42 },
];

export const MAGIC_OBJECTS: MapItem[] = [
  { id: 'varita', name: 'varita perdida', emoji: '🪄' },
  { id: 'libro', name: 'libro prohibido', emoji: '📕' },
  { id: 'llave', name: 'llave voladora', emoji: '🗝️' },
  { id: 'capa', name: 'capa invisible', emoji: '🧥' },
  { id: 'rana', name: 'rana de chocolate', emoji: '🐸' },
  { id: 'copa', name: 'copa encantada', emoji: '🏆' },
  { id: 'pluma', name: 'pluma mágica', emoji: '🪶' },
];

export const NARRATOR_LINES = [
  "Señores, el mapa no miente... solo se burla discretamente.",
  "Observen bien, porque después todos dirán: ‘yo sí lo vi’. Ajá.",
  "Quien memorice esto merece puntos. Quien no, merece ir con Filch.",
  "Si se pierde la varita, mínimo no pierdan la dignidad."
];
