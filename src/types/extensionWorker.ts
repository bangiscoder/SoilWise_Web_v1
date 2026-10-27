import { SavedAnalysisSummary } from './analysisHistory';

export type ExtensionWorkerStatus = 'active' | 'inactive' | 'suspended';

export interface ExtensionWorker {
  id: string; // Document ID in 'extension_workers'
  uid: string; // Auth UID in 'users'
  staffId: string; // e.g. "EW-KAD-2026-001"
  name: string;
  email: string;
  phone: string;
  coverageState: string;
  coverageLgas: string[];
  organization: string;
  assignedFarmerIds: string[];
  onboardedFarmerIds: string[];
  specialization?: string;
  status: ExtensionWorkerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByAdminEmail: string;
  welcomeEmailSent: boolean;
  welcomeEmailSentAt?: string;
  initialTemporaryPassword?: string;
}

export interface CreateExtensionWorkerInput {
  name: string;
  email: string;
  password?: string;
  phone: string;
  staffId?: string;
  coverageState: string;
  coverageLgas: string[];
  organization: string;
  specialization?: string;
  notes?: string;
  initialAssignedFarmerIds?: string[];
  sendWelcomeEmail?: boolean;
}

export interface ExtensionWorkerFarmerActivity {
  farmerUid: string;
  farmerName: string;
  farmerEmail: string;
  farmerPhone?: string;
  state?: string;
  lga?: string;
  relationship: 'onboarded' | 'assigned';
  onboardedAt?: string;
  totalAnalyses: number;
  latestAnalysisDate?: string;
  latestTopCrop?: string;
  latestTopVariety?: string;
  latestYieldPotential?: number;
  latestScore?: number;
  analyses: SavedAnalysisSummary[];
}

export interface ExtensionWorkerSummaryStats {
  totalWorkers: number;
  activeWorkers: number;
  totalFarmersCovered: number;
  totalAnalysesMonitored: number;
  stateDistribution: Record<string, number>;
}
