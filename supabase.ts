/**
 * PrinceVChat - Supabase Client
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nyixcwollfqiojulsznw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

class SupabaseClient {
  private url: string;
  private key: string;
  private isServiceRole: boolean;

  constructor(url?: string, key?: string, isServiceRole = false) {
    this.url = url || SUPABASE_URL;
    this.key = key || SUPABASE_KEY;
    this.isServiceRole = isServiceRole;
  }

  private async request<T>(
    method: string,
    table: string,
    body?: unknown,
    query?: Record<string, string>
  ): Promise<SupabaseResponse<T>> {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      
      if (query) {
        const params = new URLSearchParams(query);
        url += '?' + params.toString();
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': this.key,
      };

      if (!this.isServiceRole) {
        headers['Authorization'] = `Bearer ${this.key}`;
      } else {
        headers['Authorization'] = `Bearer ${this.key}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        return { data: null, error: new Error(data.message || 'Request failed') };
      }

      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // User operations
  async createUser(id: string, username: string, displayName?: string): Promise<SupabaseResponse<unknown>> {
    return this.request('POST', 'users', {
      id,
      username,
      display_name: displayName || username,
    });
  }

  async getUser(username: string): Promise<SupabaseResponse<unknown[]>> {
    return this.request('GET', 'users', undefined, {
      username: `eq.${username}`,
      select: '*',
    });
  }

  async updateUserLastSeen(id: string): Promise<SupabaseResponse<unknown>> {
    return this.request('PATCH', `users?id=eq.${id}`, {
      last_seen: new Date().toISOString(),
    });
  }

  // Room operations
  async createRoom(roomId: string, hostId: string, name?: string): Promise<SupabaseResponse<unknown>> {
    return this.request('POST', 'rooms', {
      id: roomId,
      name: name || `${hostId}'s Room`,
      host_id: hostId,
      is_active: true,
    });
  }

  async getRoom(roomId: string): Promise<SupabaseResponse<unknown[]>> {
    return this.request('GET', 'rooms', undefined, {
      id: `eq.${roomId}`,
      select: '*',
    });
  }

  async deactivateRoom(roomId: string): Promise<SupabaseResponse<unknown>> {
    return this.request('PATCH', `rooms?id=eq.${roomId}`, {
      is_active: false,
    });
  }

  // Participant operations
  async joinRoom(roomId: string, userId: string, isHost = false): Promise<SupabaseResponse<unknown>> {
    // First check if already participant
    const existing = await this.request('GET', 'room_participants', undefined, {
      room_id: `eq.${roomId}`,
      user_id: `eq.${userId}`,
      left_at: 'is.null',
    });

    if (existing.data && (existing.data as unknown[]).length > 0) {
      return { data: existing.data as unknown, error: null };
    }

    return this.request('POST', 'room_participants', {
      room_id: roomId,
      user_id: userId,
      is_host: isHost,
    });
  }

  async leaveRoom(roomId: string, userId: string): Promise<SupabaseResponse<unknown>> {
    return this.request('PATCH', `room_participants?room_id=eq.${roomId}&user_id=eq.${userId}&left_at=is.null`, {
      left_at: new Date().toISOString(),
    });
  }

  async getRoomParticipants(roomId: string): Promise<SupabaseResponse<unknown[]>> {
    return this.request('GET', 'room_participants', undefined, {
      room_id: `eq.${roomId}`,
      left_at: 'is.null',
      select: '*,users!inner(id,username,display_name,avatar_url)',
    });
  }

  async setHandRaised(roomId: string, userId: string, raised: boolean): Promise<SupabaseResponse<unknown>> {
    return this.request('PATCH', `room_participants?room_id=eq.${roomId}&user_id=eq.${userId}&left_at=is.null`, {
      is_hand_raised: raised,
    });
  }
}

export const supabase = new SupabaseClient();
export default SupabaseClient;