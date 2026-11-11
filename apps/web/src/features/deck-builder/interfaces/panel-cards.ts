import type { CardDef } from '@gwent/engine';

export interface PanelCard {
  def: CardDef;
  count: number;
  enabled: boolean;
}
