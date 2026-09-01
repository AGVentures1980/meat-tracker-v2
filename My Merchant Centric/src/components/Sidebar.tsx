'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import styles from './Sidebar.module.css';
import {
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Video,
  Flame,
  Utensils,
  Users,
  Bell,
  HeartHandshake,
  Mail,
  MessageCircle,
  Settings,
  LogOut,
  Sparkles,
  Database,
  Globe,
} from 'lucide-react';

interface SidebarUser {
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<SidebarUser | null>(null);

  const activeLocId = searchParams.get('locationId') || searchParams.get('entityId') || (typeof window !== 'undefined' ? localStorage.getItem('brasa_selected_entity') : null);

  useEffect(() => {
    const storedUser = localStorage.getItem('brasa_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('brasa_user');
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('brasa_user');
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isLocationScopedPath = (path: string) => {
    const locationPaths = [
      '/dashboard',
      '/reviews',
      '/social',
      '/themes',
      '/menu-intelligence',
      '/people',
      '/competitors',
      '/alerts',
      '/recovery',
      '/ask-brasa'
    ];
    return locationPaths.includes(path);
  };

  const getHref = (path: string) => {
    if (isLocationScopedPath(path) && activeLocId && activeLocId !== 'ALL') {
      return `${path}?locationId=${activeLocId}&entityId=${activeLocId}`;
    }
    return path;
  };

  const menuItems = [
    {
      title: 'Reputation Intelligence',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Locations 360', path: '/locations', icon: MapPin },
        { name: 'Monitored Entities', path: '/monitored-entities', icon: Globe },
        { name: 'Reviews Manager', path: '/reviews', icon: MessageSquare },
        { name: 'Social Listening', path: '/social', icon: Video },
        { name: 'Themes & Gaps', path: '/themes', icon: Flame },
      ],
    },
    {
      title: 'Business Insights',
      items: [
        { name: 'Menu Intelligence', path: '/menu-intelligence', icon: Utensils },
        { name: 'People & Tenure', path: '/people', icon: Users },
        { name: 'Competitors', path: '/competitors', icon: Sparkles },
      ],
    },
    {
      title: 'Workflows & Action',
      items: [
        { name: 'Alerts Center', path: '/alerts', icon: Bell },
        { name: 'Guest Recovery', path: '/recovery', icon: HeartHandshake },
        { name: 'Ask BRASA', path: '/ask-brasa', icon: MessageCircle },
        { name: 'Pulse Reports', path: '/reports', icon: Mail },
      ],
    },
  ];

  const showAdmin = user?.roles.includes('CORPORATE_ADMIN');

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoText}>
          <Flame size={20} className={styles.logoPulse} />
          <span>BRASA Brand Pulse™</span>
        </div>
        <span className={styles.logoPulse}>REPUTATION OS</span>
      </div>

      <nav className={styles.navSection}>
        {menuItems.map((section, idx) => (
          <div key={idx}>
            <h4 className={styles.sectionTitle}>{section.title}</h4>
            <ul className={styles.navList}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                return (
                  <li key={item.path}>
                    <Link
                      href={getHref(item.path)}
                      className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {showAdmin && (
          <div>
            <h4 className={styles.sectionTitle}>System Management</h4>
            <ul className={styles.navList}>
              <li>
                <Link
                  href="/admin"
                  className={`${styles.navLink} ${pathname === '/admin' ? styles.activeLink : ''}`}
                >
                  <Settings size={18} />
                  <span>Admin Panel</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/data-sources"
                  className={`${styles.navLink} ${pathname === '/admin/data-sources' ? styles.activeLink : ''}`}
                >
                  <Database size={18} />
                  <span>Data Sources</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/integrations"
                  className={`${styles.navLink} ${pathname === '/admin/integrations' ? styles.activeLink : ''}`}
                >
                  <Sparkles size={18} />
                  <span>Integrations</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {user && (
        <div className={styles.footer}>
          <div className={styles.userInfo}>
            {user.firstName} {user.lastName}
          </div>
          <div className={styles.userRole}>
            {user.roles.join(', ').replace('_', ' ')}
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={<aside className={styles.sidebar}>Loading Nav...</aside>}>
      <SidebarContent />
    </Suspense>
  );
}
