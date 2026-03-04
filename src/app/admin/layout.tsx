'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

interface Profile { id: string; role: string; name: string; email: string; is_original_superadmin?: boolean; }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(260);

    useEffect(() => {
        async function loadProfile() {
            const res = await fetch('/api/data?table=profile');
            if (!res.ok) { router.push('/auth/admin/login'); return; }
            const data = await res.json();
            if (!data || (data.role !== 'admin' && data.role !== 'superadmin')) { router.push('/select-role'); return; }
            setProfile(data);
            setLoading(false);
        }
        loadProfile();

        const observer = new MutationObserver(() => {
            const sidebar = document.querySelector('.admin-sidebar') as HTMLElement;
            if (sidebar) setSidebarWidth(sidebar.offsetWidth);
        });
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) observer.observe(sidebar, { attributes: true, attributeFilter: ['style'] });
        return () => observer.disconnect();
    }, []);

    if (loading) return <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;
    if (!profile) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#030712' }}>
            <AdminSidebar profileName={profile.name} role={profile.role} isOriginal={profile.is_original_superadmin} />
            <main className="admin-main" style={{ marginLeft: sidebarWidth, minHeight: '100vh', padding: '32px 32px', transition: 'margin-left 0.3s ease' }}>
                {children}
            </main>
        </div>
    );
}
