import { StoryDefinition } from './storyTypes';
import { copaCasasClasica } from './stories/copaCasasClasica';
import { nocheEnElCastillo } from './stories/nocheEnElCastillo';
import { torneoMagicoRelampago } from './stories/torneoMagicoRelampago';
import { copaRotativaMagica } from './stories/copaRotativaMagica';

export const STORY_CATALOG: StoryDefinition[] = [
  copaRotativaMagica,
  copaCasasClasica,
  nocheEnElCastillo,
  torneoMagicoRelampago
];

export function getStoryById(id: string): StoryDefinition | undefined {
  return STORY_CATALOG.find(s => s.id === id);
}
