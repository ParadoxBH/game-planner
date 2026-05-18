import { BaseRepository } from './BaseRepository';
import type { Shop, ShopGroup } from '../types/gameModels';
import { db } from '../db/gameDatabase';
import { categoryRepository } from './CategoryRepository';

export class ShopRepository extends BaseRepository<Shop, string> {
  constructor() {
    super(db.shops);
  }

  private async mergeCategoriesWithShop(shop: Shop): Promise<Shop> {
    const allCategories = await categoryRepository.getAll();
    const shopGroupsFromCategories: ShopGroup[] = allCategories
      .filter((c: any) => c.shopId === shop.id && c.items && c.items.length > 0)
      .map((c: any) => ({
        name: c.name,
        items: c.items || [],
        event: c.event || c.events,
      }));

    return {
      ...shop,
      groups: [...(shop.groups || []), ...shopGroupsFromCategories]
    };
  }

  async getById(id: string): Promise<Shop | undefined> {
    const shop = await super.getById(id);
    if (!shop) return undefined;
    return this.mergeCategoriesWithShop(shop);
  }

  async getAll(): Promise<Shop[]> {
    const shops = await super.getAll();
    return Promise.all(shops.map(shop => this.mergeCategoriesWithShop(shop)));
  }

  async getByNpcId(npcId: string): Promise<Shop | undefined> {
    const shop = await this.table.where('npcId').equals(npcId).first();
    if (!shop) return undefined;
    return this.mergeCategoriesWithShop(shop);
  }
}

export const shopRepository = new ShopRepository();
