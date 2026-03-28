import type { ReactNode } from 'react';

import { Header } from '@/components/Header/Header';

import styles from './layout.module.scss';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <div className={styles.layout}>
            <Header />
            <main className={styles.main}>{children}</main>
        </div>
    );
}
