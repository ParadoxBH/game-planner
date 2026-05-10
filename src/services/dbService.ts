import { db } from '../db/gameDatabase';
import { loadGameData, loadGamesList, loadGameMaps, loadVersion } from './dataLoader';
import { itemRepository } from '../repositories/ItemRepository';
import { recipeRepository } from '../repositories/RecipeRepository';
import { entityRepository } from '../repositories/EntityRepository';
import { shopRepository } from '../repositories/ShopRepository';
import { eventRepository } from '../repositories/EventRepository';
import { referencePointRepository } from '../repositories/ReferencePointRepository';
import { codeRepository } from '../repositories/CodeRepository';
import { conjuntoRepository } from '../repositories/ConjuntoRepository';
import { gameInfoRepository } from '../repositories/GameInfoRepository';
import { mapRepository } from '../repositories/MapRepository';
import { categoryRepository } from '../repositories/CategoryRepository';

export class DbService {
  private reconstructionPromise: Promise<void> | null = null;
  private currentReconstructionGameId: string | null = null;
  /**
   * Reconstructs the local database from remote JSON files
   */
  async reconstructDatabase(gameId: string): Promise<void> {
    // 1. Prevent concurrent reconstructions for the same game
    if (this.reconstructionPromise && this.currentReconstructionGameId === gameId) {
      console.log(`[DbService] Reconstruction already in progress for ${gameId}. Returning existing promise.`);
      return this.reconstructionPromise;
    }

    this.currentReconstructionGameId = gameId;
    this.reconstructionPromise = (async () => {
      console.log(`[DbService] Reconstructing database for game: ${gameId}`);
      
      // 3. Fetch all data in parallel
      const datasets = ["items", "recipes", "entity", "shops", "events", "referencePoints", "codes", "conjuntos", "categories", "shopCategories"];
      let bug = "Iniciando...";
      try {
        bug = "Carregando dados";
        const results = await Promise.all([
          ...(datasets.map((ds) => 
            loadGameData<any>(gameId, ds).catch((err) => {
              console.warn(`[DbService] Dataset ${ds} not found for ${gameId}.`, err);
              return [];
            })
          ) as Promise<any>[]),
          loadGamesList(),
          loadGameMaps(gameId),
          loadVersion()
        ]);
        bug = "Mapeando informações em variaveis";
        const [
          items, 
          recipes, 
          entities, 
          shops, 
          events, 
          referencePoints, 
          codes, 
          conjuntos, 
          categories,
          shopCategories,
          games, 
          maps = [],
          version
        ] = results as any[];

        bug = "Procurando informação de jogo";
        const gameInfo = games.find((g: any) => g.id === gameId);

        // 2. Clear and populating in a transaction for atomicity
        bug = "Limpando Base de dados";
        await db.transaction('rw', db.tables, async () => {
          await db.clearAll();

          const clean = <T>(data: T[], key: keyof T, name: string) => this.cleanDuplicates(data, key, name);

          bug = "Populando Itens";
          if (items?.length) await itemRepository.bulkAdd(clean(items, 'id', 'Items'));
          bug = "Populando Receitas";
          if (recipes?.length) await recipeRepository.bulkAdd(clean(recipes, 'id', 'Recipes'));
          bug = "Populando Entidades";
          if (entities?.length) await entityRepository.bulkAdd(clean(entities, 'id', 'Entities'));
          bug = "Populando Lojas";
          if (shops?.length) {
            const normalizedShops = shops.map((s: any) => ({
              ...s,
              event: s.event || s.events || undefined
            }));
            await shopRepository.bulkAdd(clean(normalizedShops, 'id', 'Shops'));
          }
          bug = "Populando Eventos";
          if (events?.length) await eventRepository.bulkAdd(clean(events, 'id', 'Events'));
          bug = "Populando Pontos de Referência";
          if (referencePoints?.length) {
            const normalizedPoints = referencePoints.map((p: any) => ({
              ...p,
              event: p.event || p.events || undefined
            }));
            await referencePointRepository.bulkAdd(clean(normalizedPoints, 'id', 'ReferencePoints'));
          }
          bug = "Populando Códigos";
          if (codes?.length) await codeRepository.bulkAdd(clean(codes, 'code', 'Codes'));
          bug = "Populando Conjuntos";
          if (conjuntos?.length) await conjuntoRepository.bulkAdd(clean(conjuntos, 'id', 'Conjuntos'));
          bug = "Populando Informações do Jogo";
          if (gameInfo) await gameInfoRepository.bulkAdd([gameInfo]);
          bug = "Populando Mapas";
          if (maps?.length) await mapRepository.bulkAdd(clean(maps, 'id', 'Maps'));
          bug = "Populando Categorias";
          if (categories?.length || shopCategories?.length) {
            const allCategories = [...(categories || []), ...(shopCategories || [])].map((c: any) => ({
              ...c,
              event: c.event || c.events || undefined
            }));
            await categoryRepository.bulkAdd(clean(allCategories, 'id', 'Categories'));
          }

          // Store the remote version we just downloaded
          bug = "Salvando versão do banco";
          await db.settings.put({ key: 'db_version', value: version.timestamp || version.version });
        });

        console.log(`[DbService] Database reconstruction complete for ${gameId}`);
      } catch (error) {
        console.error(`[DbService] Error during stage "${bug}" for game ${gameId}:`, error);
        throw error;
      } finally {
        this.reconstructionPromise = null;
        this.currentReconstructionGameId = null;
      }
    })();

    return this.reconstructionPromise;
  }

  /**
   * Helper to ensure unique keys in a dataset and log duplicates
   */
  private cleanDuplicates<T>(data: T[], keyField: keyof T, datasetName: string): T[] {
    const seen = new Set();
    const unique: T[] = [];
    const duplicates: any[] = [];

    for (const item of data) {
      if (!item) continue;
      const val = item[keyField];
      if (val === undefined || val === null) {
        console.warn(`[DbService] Item missing key "${String(keyField)}" in dataset "${datasetName}":`, item);
        continue;
      }
      if (seen.has(val)) {
        duplicates.push(val);
      } else {
        seen.add(val);
        unique.push(item);
      }
    }

    if (duplicates.length > 0) {
      console.warn(`[DbService] Found ${duplicates.length} duplicated "${String(keyField)}" in dataset "${datasetName}":`, duplicates);
    }

    return unique;
  }

  /**
   * Checks if the database is already populated for a specific game
   * (Simplification: just checks if gameInfo matches)
   */
  async isDatabasePopulated(gameId: string): Promise<boolean> {
    const gameInfo = await gameInfoRepository.getById(gameId);
    if (!gameInfo) return false;

    // Check if we have any items
    const items = await itemRepository.getAll();
    if (items.length === 0) return false;

    // Version check
    try {
      const localVer = await db.settings.get('db_version');
      const remoteVer = await loadVersion();
      const remoteVal = remoteVer.timestamp || remoteVer.version;

      if (localVer && localVer.value !== remoteVal) {
        console.log(`[DbService] Outdated database version detected (Local: ${localVer.value}, Remote: ${remoteVal}). Force reconstruction.`);
        return false;
      }
      
      if (!localVer) {
        console.log(`[DbService] No local version found. Force initial reconstruction to sync with remote.`);
        return false;
      }
    } catch (err) {
      console.warn('[DbService] Failed to check version, continuing with local data.', err);
    }

    return true;
  }
}

export const dbService = new DbService();
