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
  aadharNumber: string;
  phone: string;
  address: string;
  dob: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  dob?: string;
};
