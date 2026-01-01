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
}

export type Service = {
  id: string;
  name: string;
  price: number;
};

export type Staff = {
  id: string;
  name: string;
  specialties: string[];
  workingHours: string;
  commissionPercent: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  dob?: string;
};

export type Appointment = {
  id: string;
  customerId: string;
  staffId: string;
  serviceIds: string[];
  dateTime: Date;
  status: 'booked' | 'completed' | 'cancelled';
  totalAmount: number;
};

// Mock data is being kept for now to ensure the calendar view functions
// while other parts of the app are migrated to Firestore.
export const services: Service[] = [];

export const staff: Staff[] = [];

export const customers: Customer[] = [];

export const appointments: Appointment[] = [];
