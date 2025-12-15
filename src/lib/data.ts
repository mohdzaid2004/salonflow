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

export const services: Service[] = [
  { id: '1', name: 'Men\'s Haircut', duration: 30, price: 300, gstPercent: 18, category: 'Hair' },
  { id: '2', name: 'Women\'s Haircut', duration: 60, price: 700, gstPercent: 18, category: 'Hair' },
  { id: '3', name: 'Hair Coloring', duration: 120, price: 3000, gstPercent: 18, category: 'Hair' },
  { id: '4', name: 'Classic Manicure', duration: 45, price: 500, gstPercent: 18, category: 'Nails' },
  { id: '5', name: 'Gel Pedicure', duration: 60, price: 900, gstPercent: 18, category: 'Nails' },
  { id: '6', name: 'Cleanup Facial', duration: 45, price: 800, gstPercent: 18, category: 'Skin' },
];

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
    id: '1',
    customerId: '1',
    staffId: '1',
    serviceIds: ['1'],
    dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30),
    status: 'booked',
  },
  {
    id: '2',
    customerId: '2',
    staffId: '2',
    serviceIds: ['4', '6'],
    dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0),
    status: 'booked',
  },
  {
    id: '3',
    customerId: '3',
    staffId: '3',
    serviceIds: ['2'],
    dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
    status: 'completed',
  },
];
