import Header from '@/components/Header/Header';

import styles from './layout.module.scss';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
