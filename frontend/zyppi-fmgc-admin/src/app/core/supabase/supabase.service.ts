import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/// Single Supabase client for the whole app (anon/publishable key only -
/// this is a pure client-side SPA, no server runtime, so it can never
/// hold the service-role key; every admin write goes through RLS
/// policies/RPCs gated on the admin_users table instead).
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;
  readonly session = signal<Session | null>(null);

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // withHashLocation() routing and Supabase's URL-fragment session
        // detection both use the URL hash - this app only does password
        // auth, so disable Supabase's side to avoid any collision.
        detectSessionInUrl: false,
      },
    });

    this.client.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    await this.client.auth.signOut();
  }
}
