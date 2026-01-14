// Organization (B2B) types - for Phase 2
export type OrganizationPlan = 'team' | 'business' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled';
export type OrganizationRole = 'admin' | 'manager' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: OrganizationPlan;
  maxSeats: number;
  usedSeats: number;
  billingEmail: string;
  billingAddress: string | null;
  invoicePayment: boolean;
  contractStartsAt: string;
  contractEndsAt: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  department: string | null;
  invitedBy: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationGroup {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationGroupMember {
  id: string;
  groupId: string;
  userId: string;
  createdAt: string;
}

// Organization invite
export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}
