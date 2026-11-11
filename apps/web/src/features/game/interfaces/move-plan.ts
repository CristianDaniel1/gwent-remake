import type { CardInstanceId } from '@gwent/engine';
import type { Flight } from './animations';

export interface MovePlan {
  spotlight: CardInstanceId | null;
  burned: CardInstanceId[];
  takeoff: Flight[];
  leaving: Flight[];
}
