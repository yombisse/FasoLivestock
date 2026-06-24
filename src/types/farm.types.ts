export interface Farm {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FarmsResponse {
  success: boolean;
  data: {
    farms: Farm[];
  };
}
