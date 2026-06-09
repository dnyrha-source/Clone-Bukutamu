export interface Visitor {
  id: string;
  visit_number: string;
  name: string;
  institution: string;
  position: string; // Jabatan
  phone: string;
  email: string;
  country_code: string;
  country_name: string;
  province: string;
  city: string;
  visitor_count: number;
  visit_category: string;
  visit_purpose: string;
  impression: string;
  suggestion: string;
  signature_file: string; // Base64 signature image
  visitor_photo: string | null; // Base64 camera photo or null
  language: 'id' | 'en';
  visit_date: string; // YYYY-MM-DD
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string; // Omitting password in client displays for security
  role: 'admin' | 'petugas';
  last_login: string | null;
}

export interface SystemSettings {
  tts_enabled: boolean;
  tts_volume: number; // 0 to 1
  tts_rate: number; // 0.5 to 2
  library_name?: string; // custom library name
  library_logo?: string; // base64 library logo
  head_librarian_name?: string; // custom head librarian name
  head_librarian_nip?: string; // custom head librarian NIP
  library_motto_id?: string; // custom library motto (Indonesian)
  library_motto_en?: string; // custom library motto (English)
}

export type Language = 'id' | 'en';
