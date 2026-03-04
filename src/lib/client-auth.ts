// Client-side auth helper for browser API calls
// Calls our local API routes for authentication

interface AuthUser {
    id: string;
    email: string;
    role: string;
}

interface Profile {
    id: string;
    role: string;
    name: string;
    email: string;
    reg_no?: string;
    year?: number;
    section?: string;
    department?: string;
    status: string;
    is_original_superadmin?: boolean;
}

export async function login(email: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Login failed' };
    return { user: data.user };
}

export async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getProfile(): Promise<Profile | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile;
}

// Generic DB query helper for client-side
export async function dbQuery(endpoint: string, options?: RequestInit) {
    const res = await fetch(endpoint, options);
    return res.json();
}
