export type CropType = 
  | 'maize'
  | 'sorghum'
  | 'millet'
  | 'cowpea'
  | 'rice'
  | 'soybean'
  | 'groundnut'
  | 'wheat'
  | 'cassava'
  | 'vegetable'
  | 'other';

export type CropCategory = 'cereals' | 'legumes' | 'roots-tubers' | 'vegetables';

export type SeedOrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export type DeliveryMethod = 
  | 'pickup_depot'
  | 'farm_delivery'
  | 'cooperative_hub';

export interface CropSeed {
  id: string;
  varietyName: string;
  cropType: CropType;
  category: CropCategory;
  description: string;
  maturityDays: string; // e.g. "90-95 days"
  yieldPotential: string; // e.g. "4.5 - 6.0 t/ha"
  germinationRate: number; // e.g. 95 (percentage)
  suitableAgroZone: string[]; // e.g. ["Sudan Savanna", "Northern Guinea Savanna"]
  pricePerKg: number; // e.g. 1500 (NGN)
  stockKg: number; // available stock in kilograms
  minOrderKg: number; // minimum order in kg (typically 1 or 2)
  recommendedRateKgPerHa: number; // sowing rate in kg per hectare (e.g. 20 for maize)
  breederOrg: string; // e.g. "IAR Zaria / Premier Seeds (NASC Certified)"
  packagingOptions: string[]; // e.g. ["2kg packet", "5kg bag", "10kg bag", "25kg bag", "50kg bag"]
  imageUrl?: string;
  inStock: boolean;
  featured?: boolean;
  tags: string[]; // e.g. ["Drought-Tolerant", "Striga-Resistant", "Early-Maturing"]
  plantingSeason?: string; // e.g. "May - July (Rainfed) or Nov - Feb (Irrigated)"
  isCustomAdminSeed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeedOrder {
  id: string;
  orderNumber: string;
  seedId: string;
  seedName: string;
  cropType: CropType;
  quantityKg: number;
  pricePerKg: number;
  totalPrice: number;
  currency: string;
  farmerName: string;
  farmerPhone: string;
  farmerEmail?: string;
  state: string;
  lga: string;
  farmLocationOrAddress: string;
  deliveryMethod: DeliveryMethod;
  deliveryNotes?: string;
  status: SeedOrderStatus;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CropCategoryOption {
  id: CropCategory | 'all';
  label: string;
  iconName?: string;
}
