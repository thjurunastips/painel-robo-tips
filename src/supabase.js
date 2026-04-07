// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas chaves reais do Supabase (as mesmas que usou no Python)
const supabaseUrl = 'https://qzngywderdeclrbmmgjo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bmd5d2RlcmRlY2xyYm1tZ2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzM2NzcsImV4cCI6MjA5MTE0OTY3N30.j9aEleDB9TtGz_Ik1y0rGX_o0Wo8NMunRB9X1tRgx2w';

export const supabase = createClient(supabaseUrl, supabaseKey);