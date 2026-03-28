'use client';

import { useCallback } from 'react';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './Header.module.scss';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <header className={styles.header}>
      <Link href='/dashboard' className={styles.logo}>
        AI Pipeline
      </Link>
      <div className={styles.right}>
        <Link href='/documents/summary' className={styles.docLink}>
          Summary
        </Link>
        <Link href='/documents/technical-overview' className={styles.docLink}>
          Technical Overview
        </Link>
        {user && (
          <>
            <span className={styles.email}>{user.email}</span>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
