export type Salon = {
  id: string;
  name: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  appointmentsEnabled?: boolean;
  themeColor?: string;
  loyaltyPointsRatio?: number;
  loyaltyProgramEnabled?: boolean;
  billingStatus?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'pending' | 'halted';
  trialEndsAt?: unknown; // Firebase Timestamp
  subscriptionPlanId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  nextBillingDate?: unknown; // Firebase Timestamp
  automatedWhatsappEnabled?: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsappNumber?: string;
  email?: string;
};

export type Service = {
  id: string;
  name: string;
  price: number;
};

export type Staff = {
  id: string;
  name: string;
  aadharNumber: string;
  phone: string;
  address: string;
  dob: string;
  role?: string;
};

export type Customer = {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  dob?: string;
  visitHistory: string[];
  loyaltyPoints?: number;
  email?: string;
};

export type Appointment = {
  id: string;
  salonId: string;
  customerId: string;
  customerName: string; // denormalized for easy display
  customerPhone: string; // denormalized for easy display
  staffId: string;
  serviceIds: string[];
  date: unknown; // Firebase Timestamp
  status: 'booked' | 'active' | 'completed' | 'cancelled';
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  subtotal: number;
  pointsRedeemed: number;
  amountPaid: number;
  feedbackSubmitted?: boolean;
  feedbackRating?: number | null;
  feedbackSubmittedAt?: any;
};

export type Review = {
  id: string;
  salonId: string;
  staffId: string;
  customerId: string;
  appointmentId: string;
  rating: number;
  comment?: string;
  createdAt: unknown; // Firebase Timestamp
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  staffLimit: number;
  features: string[];
  isPopular: boolean;
};

export type InventoryProduct = {
  id: string;
  salonId: string;
  name: string;
  brand?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  unitPrice: number;
};

export const PREDEFINED_ROLES = [
  'Salon Manager',
  'Receptionist',
  'Senior Hair Stylist',
  'Junior Hair Stylist',
  'Barber',
  'Hair Color Specialist',
  'Beauty Therapist',
  'Makeup Artist',
  'Nail Technician',
  'Facial Specialist',
  'Massage Therapist',
  'Cleaner / Housekeeping',
  'Cashier',
  'Trainee'
] as const;
