// Payment types
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentMethod = 'card' | 'invoice';

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId: string | null;
  stripeSessionId: string | null;
  metadata: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentItem {
  id: string;
  paymentId: string;
  courseId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  finalPrice: number;
  createdAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  courseId: string;
  addedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  courseId: string | null; // null = applicable to all courses
  instructorId: string | null; // who created it
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = 'percentage' | 'fixed';

// Cart operations
export interface AddToCartInput {
  courseId: string;
}

// Checkout
export interface CheckoutInput {
  couponCode?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

// Price calculation
export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  total: number;
  appliedCoupon: {
    code: string;
    discountAmount: number;
  } | null;
  items: {
    courseId: string;
    title: string;
    originalPrice: number;
    finalPrice: number;
  }[];
}
