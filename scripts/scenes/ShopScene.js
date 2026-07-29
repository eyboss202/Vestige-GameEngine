import { Scene } from '../core/Scene.js';
import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from '../ui/BitmapFont.js';
import { panel } from '../ui/NineSlice.js';
import { MenuList } from '../ui/MenuList.js';
import { Input } from '../core/Input.js';
import { Audio } from '../systems/AudioSystem.js';
import { GameState } from '../core/GameState.js';
import { getItem } from '../entities/items/ItemDatabase.js';
import { getShop, priceFor } from '../data/shops.js';
import { t, localised } from '../core/I18n.js';
import { Notifications } from '../systems/NotificationSystem.js';

const CURRENCY = 'scrip';

/** Buy/sell screen for a merchant NPC — see NPC `shop` field and the
 *  'shop:open' event GameScene listens for. Currency is just an item
 *  (`scrip`), so trading is plain Inventory.add()/remove() both ways. */
export class ShopScene extends Scene {
  constructor(game) {
    super(game);
    this.transparent = true;
    this.mode = 'buy';
    this.shop = null;
    this.menu = null;
  }

  enter({ shopId } = {}) {
    this.shop = getShop(shopId);
    this.mode = 'buy';
    this.build();
  }

  build() {
    const items = this.mode === 'buy' ? this.buyItems() : this.sellItems();
    if (!items.length) items.push({ label: t('shop.empty'), disabled: true });
    items.push({ label: t('menu.back'), onSelect: () => this.game.scenes.pop() });
    const index = this.menu?.index ?? 0;
    this.menu = new MenuList(items, { spacing: 14, onCancel: () => this.game.scenes.pop() });
    this.menu.index = Math.min(index, items.length - 1);
  }

  buyItems() {
    if (!this.shop) return [];
    return this.shop.sells
      .filter((entry) => entry.stock == null || entry.stock > 0)
      .map((entry) => {
        const def = getItem(entry.itemId);
        return {
          label: localised(def?.name, entry.itemId),
          value: priceFor(this.shop, entry.itemId, true, def?.value ?? 0),
          onSelect: () => this.buy(entry),
        };
      });
  }

  sellItems() {
    const categories = this.shop?.buysCategories ?? [];
    return GameState.inventory.slots
      .filter((s) => s.itemId !== CURRENCY && categories.includes(getItem(s.itemId)?.category))
      .map((s) => {
        const def = getItem(s.itemId);
        return {
          label: `${localised(def?.name, s.itemId)} x${s.qty}`,
          value: priceFor(this.shop, s.itemId, false, def?.value ?? 0),
          onSelect: () => this.sell(s.itemId),
        };
      });
  }

  buy(entry) {
    const def = getItem(entry.itemId);
    const price = priceFor(this.shop, entry.itemId, true, def?.value ?? 0);
    if (!GameState.inventory.has(CURRENCY, price)) {
      Audio.playSfx('ui_back'); Notifications.push(t('shop.cantAfford')); return;
    }
    const added = GameState.inventory.add(entry.itemId, 1);
    if (added <= 0) { Audio.playSfx('ui_back'); Notifications.push(t('notify.full')); return; }
    GameState.inventory.remove(CURRENCY, price);
    if (entry.stock != null) entry.stock -= 1;
    Audio.playSfx('pickup');
    Notifications.push(t('shop.bought', { name: localised(def?.name, entry.itemId) }));
    this.build();
  }

  sell(itemId) {
    const def = getItem(itemId);
    const price = priceFor(this.shop, itemId, false, def?.value ?? 0);
    // An equipped item still lives in the bag (systems/InventorySystem.js
    // Equipment) — unequip it first so a sale never leaves GameState.equipment
    // pointing at an item the player no longer owns.
    if (def?.slot && GameState.equipment.get(def.slot) === itemId) {
      GameState.equipment.unequip(GameState.inventory, def.slot);
    }
    GameState.inventory.remove(itemId, 1);
    GameState.inventory.add(CURRENCY, price);
    Audio.playSfx('pickup');
    Notifications.push(t('shop.sold', { name: localised(def?.name, itemId) }));
    this.build();
  }

  update(dt) {
    if (Input.justPressed('inventory')) {
      this.mode = this.mode === 'buy' ? 'sell' : 'buy';
      Audio.playSfx('ui_move');
      this.build();
    }
    this.menu.update(dt);
  }

  render(renderer) {
    const ctx = renderer.ctx;
    ctx.fillStyle = 'rgba(7,9,11,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const w = 210;
    const h = this.menu.height + 46;
    const x = (VIEW_W - w) / 2;
    const y = Math.max(8, (VIEW_H - h) / 2);
    panel(ctx, x, y, w, h);
    Font.draw(ctx, t('shop.title'), x + 12, y + 8, { color: PALETTE.glow });
    Font.draw(ctx, `[I] ${t(this.mode === 'buy' ? 'shop.buy' : 'shop.sell')}`, x + w - 10, y + 8, { color: PALETTE.dim, align: 'right' });
    this.menu.render(renderer, x + 20, y + 26, { width: w - 40 });
    const balance = GameState.inventory.quantity(CURRENCY);
    Font.draw(ctx, `${t('shop.balance')}: ${balance}`, x + 12, y + h - 10, { color: PALETTE.amber });
  }
}
