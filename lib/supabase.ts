import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Updated types for our refactored application
export interface Client {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  discord?: string;      // ← Ajout de cette ligne
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  token: string;
  client_id: string;
  type: string;
  used: boolean;
  used_at?: string;
  created_at: string;
  expires_at?: string;
  // Legacy fields for backward compatibility
  email?: string;
  phone?: string;
}

export interface Attestation {
  id: string;
  token_id: string;
  client_id: string;
  prestataire_nom: string;
  prestataire_prenom: string;
  prestataire_email: string;
  prestataire_telephone?: string;
  prestataire_adresse?: string;
  prestataire_siret?: string;
  client_nom: string;
  client_adresse: string;
  prestation_description: string;
  prestation_date_debut: string;
  prestation_date_fin: string;
  prestation_montant: number;
  prestation_lieu?: string;
  status: "draft" | "completed" | "sent";
  pdf_generated: boolean;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  courts: string[];
  categories: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Extended types for admin interface
export interface ClientWithStats extends Client {
  active_tokens_count: number;
  total_attestations_count: number;
  completed_attestations_count: number;
  pending_attestations_count: number;
}

export interface TokenWithClient extends Token {
  client: Client;
}

export interface AttestationWithClient extends Attestation {
  client: Client;
}
