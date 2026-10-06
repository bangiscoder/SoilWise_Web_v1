import iarDatabaseRaw from './iar_crop_varieties_database.json';
import type { IarVarietyRecord, IarCropVarietiesDatabase } from '../types/cropRecommendation';

/**
 * IAR Crop Variety Descriptors Compendium
 * Reference Knowledge Layer (Layer A)
 * 
 * Canonical source: iar_crop_varieties_database.json
 * Publisher: Institute for Agricultural Research (IAR), Federal Ministry of Agriculture and Food Security, Ahmadu Bello University, Zaria, Nigeria
 * 
 * Preserves original documented variety descriptors without destructive transformation.
 */

export const IAR_DATABASE = iarDatabaseRaw as unknown as IarCropVarietiesDatabase;
export const IAR_DATASET_METADATA = IAR_DATABASE.metadata;

/**
 * Extract all variety records across all documented crop categories.
 * Preserves the original fields and enriches with numeric min/max maturity days for evaluation.
 */
export function loadAllIarVarieties(): IarVarietyRecord[] {
  const all: IarVarietyRecord[] = [];
  const categories = Object.keys(IAR_DATABASE.crop_categories || {});
  
  for (const cat of categories) {
    const list = IAR_DATABASE.crop_categories[cat] || [];
    for (const item of list) {
      let min: number | undefined = undefined;
      let max: number | undefined = undefined;
      
      if (item.maturity_days) {
        const matchRange = item.maturity_days.match(/(\d+)\s*[-–to]+\s*(\d+)/i);
        if (matchRange) {
          min = parseInt(matchRange[1], 10);
          max = parseInt(matchRange[2], 10);
        } else {
          const matchSingle = item.maturity_days.match(/(\d+)/);
          if (matchSingle) {
            min = parseInt(matchSingle[1], 10);
            max = parseInt(matchSingle[1], 10);
          }
        }
      }

      all.push({
        ...item,
        maturity_days_min: min,
        maturity_days_max: max,
      });
    }
  }
  return all;
}

export const IAR_CROP_VARIETIES: IarVarietyRecord[] = loadAllIarVarieties();
