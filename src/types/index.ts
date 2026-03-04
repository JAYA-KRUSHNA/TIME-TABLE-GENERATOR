export type UserRole = 'student' | 'faculty' | 'admin' | 'superadmin';
export type AccountStatus = 'active' | 'pending' | 'rejected' | 'unverified';

export interface Profile {
    id: string;
    role: UserRole;
    name: string;
    email: string;
    reg_no?: string;
    year?: number;
    section?: string;
    department?: string;
    status: AccountStatus;
    avatar_url?: string;
    is_original_superadmin?: boolean;
    created_at: string;
    updated_at: string;
}

export interface OTPRecord {
    id: string;
    email: string;
    code: string;
    purpose: 'verification' | 'password_reset';
    attempts: number;
    max_attempts: number;
    expires_at: string;
    created_at: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
}

export interface Subject {
    id: string;
    name: string;
    department_id: string;
    type: 'theory' | 'lab';
    hours_per_week: number;
    lab_type_id?: string;
}

export interface Section {
    id: string;
    department_id: string;
    year: number;
    section_name: string;
    student_count: number;
    max_capacity: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    read_status: boolean;
    created_at: string;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'broadcast';
    participant_ids: string[];
    department_id?: string;
    created_at: string;
}
