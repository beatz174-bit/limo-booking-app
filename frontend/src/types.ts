export interface Settings {
  flagfall: number;
  per_km_rate: number;
  per_min_rate: number;
  google_maps_api_key: string;
  account_mode: "open" | "staged";
}

export interface AdminSetupForm {
    admin_email: string;
    admin_password: string;
    full_name: string;
    settings: Settings 
}

