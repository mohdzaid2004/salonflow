export type Service = {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  gstPercent: number;
  category: string;
};

export type Staff = {
  id: string;
  name: string;
  specialties: string[];
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type Appointment = {
  id: string;
  customerId: string;
  staffId: string;
  serviceIds: string[];
  dateTime: Date;
  status: 'booked' | 'completed' | 'cancelled';
};

// Mock data is being kept for now to ensure the calendar view functions
// while other parts of the app are migrated to Firestore.
export const services: Service[] = [];

export const staff: Staff[] = [
  { id: '1', name: 'Ravi Kumar', specialties: ['Hair', 'Coloring'] },
  { id: '2', name: 'Priya Sharma', specialties: ['Skin', 'Nails'] },
  { id: '3', name: 'Anjali Singh', specialties: ['Hair', 'Nails'] },
];

export const customers: Customer[] = [
  { id: '1', name: 'Aarav Patel', phone: '+919876543210' },
  { id: '2', name: 'Diya Mehta', phone: '+919123456789' },
  { id: '3', name: 'Rohan Gupta', phone: '+918765432109' },
];

const now = new Date();
export const appointments: Appointment[] = [
  {
    id: 'mock-1',
    customerId: '1',
    staffId: '1',
    serviceIds: ['1'], // Corresponds to a service that will be in Firestore
    dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30),
    status: 'booked',
  },
  {
    id: 'mock-2',
    customerId: '2',
    staffId: '2',
    serviceIds: ['4', '6'], // Corresponds to services that will be in Firestore
    dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0),
    status: 'booked',
  },
  {
    id: 'mock-3',
    customerId: '3',
    staffId: '3',
    serviceIds: ['2'], // Corresponds to a service that will be in Firestore
    dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
    status: 'completed',
  },
];
