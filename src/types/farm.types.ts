export interface Farm {
  id: string;
  name: string;
  description?: string;
  location?: string;
  type_elevage?: string;
  photo?: string;
  owner_id: string;
  status?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_modified_by?: string;
  version?: number;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FarmUser {
  id: string;
  farm_id: string;
  user_id: string;
  role?: string;
  sync_status?: 'pending' | 'synced' | 'conflict';
  last_modified_by?: string;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface FarmsResponse {
  success: boolean;
  data: {
    farms: Farm[];
  };
}
