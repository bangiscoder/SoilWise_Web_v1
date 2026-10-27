/**
 * SoilWise AI Authentication & User Account Types (Stage 1)
 */

export type UserRole = 'user' | 'admin' | 'agronomist' | 'extension_worker';

export type AccountStatus = 'active' | 'suspended';

export interface UserPreferences {
  preferredLanguage?: 'en' | 'ha' | 'yo' | 'ig' | string;
  farmingExperience?: 'new' | 'some_experience' | 'experienced' | 'commercial' | string;
  primaryFarmingInterest?: string;
  farmingInterests?: string[];
  preferredCrops?: string[];
  phoneNumber?: string;
  state?: string;
  lga?: string;
  bio?: string;
  farmSizeHectares?: number;
  primaryCrop?: string;
}

export interface SoilWiseUserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  phoneNumber?: string | null;
  photoURL: string | null;
  role: UserRole;
  authProviders: string[]; // e.g. ['password'], ['google.com']
  accountStatus: AccountStatus;
  createdAt: string; // ISO String or serialized timestamp
  updatedAt: string;
  profile?: UserPreferences;
  activeFarmId?: string | null;
  state?: string;
  lga?: string;
  bio?: string;
  farmSizeHectares?: number;
  primaryCrop?: string;
  preferredLanguage?: string;
  farmingExperience?: string;
  primaryFarmingInterest?: string;
  farmingInterests?: string[];
  preferredCrops?: string[];
  isVipFarmer?: boolean;
  vipLevel?: string;
  vipSecuredAt?: string;
  freeDeliveryEligible?: boolean;
  earlyBirdSpotSecured?: boolean;
  earlyBirdNumber?: number;
  totalCommitmentPaidNgn?: number;
  hasFirstOrderDiscount35?: boolean;
  refundableDepositNgn?: number;
  hasCompletedCommitmentModal?: boolean;
  feedbackSurveyCompleted?: boolean;
  feedbackSubmittedAt?: string;
  lastDemand?: {
    orderId?: string;
    orderNumber?: string;
    seedId: string;
    seedName: string;
    cropType: string;
    quantityKg: number;
    commitmentAmountNgn: number;
    farmerName: string;
    farmerPhone: string;
    state: string;
    lga: string;
    deliveryAddress: string;
    submittedAt: string;
    status: string;
  };
  vipUpgradeNote?: string;
  adminUpgradedBy?: string;
  prePaidCreditApplied?: boolean;
  prePaidCreditRef?: string | null;
  onboardedByExtensionWorkerId?: string;
  onboardedByExtensionWorkerName?: string;
  assignedExtensionWorkerId?: string;
  assignedExtensionWorkerName?: string;
  extensionWorkerStaffId?: string;
}

export interface PendingVipCredit {
  id?: string;
  email: string;
  phone?: string;
  name?: string;
  amountNgn: number;
  reference?: string;
  note?: string;
  status: 'pending' | 'claimed';
  createdAt: string;
  claimedByUid?: string;
  claimedAt?: string;
  createdByAdmin?: boolean;
}

export interface UpdateProfileInput {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string | null;
  state?: string;
  lga?: string;
  bio?: string;
  farmSizeHectares?: number;
  primaryCrop?: string;
  preferredLanguage?: string;
  farmingExperience?: string;
  primaryFarmingInterest?: string;
  farmingInterests?: string[];
  preferredCrops?: string[];
  activeFarmId?: string | null;
  isVipFarmer?: boolean;
  vipLevel?: string;
  vipSecuredAt?: string;
  freeDeliveryEligible?: boolean;
  earlyBirdSpotSecured?: boolean;
  earlyBirdNumber?: number;
  totalCommitmentPaidNgn?: number;
  hasFirstOrderDiscount35?: boolean;
  refundableDepositNgn?: number;
  hasCompletedCommitmentModal?: boolean;
  feedbackSurveyCompleted?: boolean;
  feedbackSubmittedAt?: string;
  lastDemand?: SoilWiseUserProfile['lastDemand'];
}

export interface UserRegistrationInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface AuthState {
  user: SoilWiseUserProfile | null;
  firebaseUser: import('firebase/auth').User | null;
  isLoading: boolean;
  isAdmin: boolean;
}
