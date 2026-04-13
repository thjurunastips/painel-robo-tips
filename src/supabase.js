// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas chaves reais do Supabase (as mesmas que usou no Python)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);