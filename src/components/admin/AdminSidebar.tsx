'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, BookOpen, Users, ClipboardCheck, GraduationCap,
    Calendar, FileText, MessageSquare, Shield, Settings, LogOut,
    Menu, X, ChevronRight, DoorOpen, Upload, Activity,
} from 'lucide-react';

import { useRouter } from 'next/navigation';

interface AdminSidebarProps {
    profileName: string;
    role: string;
    isOriginal?: boolean;
}

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', id: 'dashboard' },
    { icon: BookOpen, label: 'College Structure', href: '/admin/structure', id: 'structure' },
    { icon: DoorOpen, label: 'Rooms & Labs', href: '/admin/rooms', id: 'rooms' },
    { icon: Upload, label: 'Data Import', href: '/admin/data-import', id: 'data-import' },
    { icon: Users, label: 'User Management', href: '/admin/users', id: 'users' },
    { icon: ClipboardCheck, label: 'Faculty Approvals', href: '/admin/approvals', id: 'approvals' },
    { icon: GraduationCap, label: 'Faculty Interests', href: '/admin/faculty-interests', id: 'faculty-interests' },
    { icon: Calendar, label: 'Timetable Generator', href: '/admin/timetable', id: 'timetable' },
    { icon: FileText, label: 'Generated Timetables', href: '/admin/timetables', id: 'timetables' },
    { icon: Activity, label: 'Generation Logs', href: '/admin/logs', id: 'logs' },
    { icon: MessageSquare, label: 'Messages', href: '/admin/messages', id: 'messages' },
];

const superAdminItems = [
    { icon: Shield, label: 'Super Admin', href: '/admin/super-admin', id: 'super-admin' },
];

export default function AdminSidebar({ profileName, role, isOriginal }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const allItems = [
        ...navItems,
        ...(role === 'superadmin' ? superAdminItems : []),
        { icon: Settings, label: 'Settings', href: '/admin/settings', id: 'settings' },
    ];

    const handleLogout = async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { }
        router.push('/');
    };

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    const sidebarContent = (
        <>
            {/* Logo/Brand */}
            <div style={{
                padding: collapsed ? '20px 12px' : '20px 24px',
                borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Calendar size={18} color="white" />
                </div>
                {!collapsed && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>OptiSchedule</h3>
                        <p style={{ fontSize: 11, color: '#64748b' }}>Admin Panel</p>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                {allItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: collapsed ? '12px' : '12px 16px',
                                marginBottom: 2,
                                borderRadius: 10,
                                textDecoration: 'none',
                                color: active ? '#818cf8' : '#94a3b8',
                                background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                transition: 'all 0.2s ease',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                position: 'relative',
                            }}
                        >
                            <item.icon size={20} />
                            {!collapsed && (
                                <>
                                    <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                                    {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                                </>
                            )}
                            {active && (
                                <div style={{
                                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                    width: 3, height: 24, borderRadius: 2,
                                    background: 'linear-gradient(180deg, #6366f1, #818cf8)',
                                }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Profile & Logout */}
            <div style={{
                padding: collapsed ? '16px 8px' : '16px 16px',
                borderTop: '1px solid rgba(99, 102, 241, 0.1)',
            }}>
                {!collapsed && (
                    <div style={{
                        padding: '12px 14px',
                        background: 'rgba(99, 102, 241, 0.06)',
                        borderRadius: 12,
                        marginBottom: 8,
                    }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{profileName}</p>
                        <p style={{ fontSize: 11, color: '#64748b' }}>
                            {role === 'superadmin' ? 'Super Admin' : 'Admin'}
                            {isOriginal && ' · Original'}
                        </p>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 10,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        color: '#f87171', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                >
                    <LogOut size={16} />
                    {!collapsed && 'Logout'}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div style={{
                display: 'none',
                position: 'fixed', top: 0, left: 0, right: 0,
                height: 60, background: 'rgba(3, 7, 18, 0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                padding: '0 16px',
                alignItems: 'center', justifyContent: 'space-between',
                zIndex: 1001,
            }} className="mobile-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Calendar size={16} color="white" />
                    </div>
                    <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15 }}>OptiSchedule</span>
                </div>
                <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 998,
                    }}
                />
            )}

            {/* Desktop sidebar */}
            <aside
                style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0,
                    width: collapsed ? 72 : 260,
                    background: 'rgba(3, 7, 18, 0.95)',
                    backdropFilter: 'blur(16px)',
                    borderRight: '1px solid rgba(99, 102, 241, 0.1)',
                    display: 'flex', flexDirection: 'column',
                    transition: 'width 0.3s ease',
                    zIndex: 999,
                    transform: mobileOpen ? 'translateX(0)' : undefined,
                }}
                className="admin-sidebar"
            >
                {sidebarContent}

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        position: 'absolute', top: 24, right: -14,
                        width: 28, height: 28, borderRadius: '50%',
                        background: '#1e293b', border: '1px solid rgba(99, 102, 241, 0.2)',
                        color: '#818cf8', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                    }}
                    className="sidebar-collapse-btn"
                >
                    {collapsed ? '›' : '‹'}
                </button>
            </aside>

            <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          .admin-sidebar {
            transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
            width: 260px !important;
            z-index: 999 !important;
          }
          .sidebar-collapse-btn { display: none !important; }
          .admin-main { margin-left: 0 !important; padding-top: 76px !important; }
        }
      `}</style>
        </>
    );
}
