export interface DashboardData {
  global: {
    total_animals: number;
    total_farms: number;
    active_farms: number;
  };
  cheptel: {
    total: number;
    by_species: {
      espece: string;
      count: number;
      percentage: number;
    }[];
    by_status: {
      statut: string;
      count: number;
      percentage: number;
    }[];
  };
  mouvements: {
    total: number;
    recent: {
      id: string;
      type: string;
      date: string;
      animal_nom: string;
      animal_id: string;
    }[];
    by_type: {
      type: string;
      count: number;
      percentage: number;
    }[];
  };
  sante: {
    healthy: number;
    sick: number;
    quarantine: number;
    health_rate: number;
  };
  reproduction: {
    total_births: number;
    pregnant: number;
    fertility_rate: number;
  };
  alimentation: {
    total_cost: number;
    monthly_cost: number;
  };
  finance: {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    monthly_revenue: number;
    monthly_expenses: number;
  };
  alertes: {
    count: number;
    items: {
      id: string;
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      created_at: string;
    }[];
  };
}

export interface FinancialEvolutionData {
  period: {
    start_date: string;
    end_date: string;
  };
  evolution: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  totals: {
    total_revenue: number;
    total_expenses: number;
    total_profit: number;
    average_monthly_revenue: number;
    average_monthly_expenses: number;
  };
}

export interface FinancialEvolutionResponse {
  success: boolean;
  message: string;
  data?: FinancialEvolutionData;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data?: DashboardData;
}
