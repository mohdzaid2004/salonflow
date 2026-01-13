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
};

export type Customer = {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  dob?: string;
  visitHistory: string;
  loyaltyPoints?: number;
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
  status: 'booked' | 'completed' | 'cancelled';
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  amountPaid: number;
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

    