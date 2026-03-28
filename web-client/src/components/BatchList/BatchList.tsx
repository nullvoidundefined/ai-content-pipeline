'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import type { Batch } from '@/types';

import styles from './BatchList.module.scss';

interface BatchListProps {
    batches: Batch[];
    isLoading: boolean;
    refetch: () => void;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function StatusBadge({ status }: { status: Batch['status'] }) {
    const classMap: Record<Batch['status'], string> = {
        pending: styles.statusPending,
        processing: styles.statusProcessing,
        complete: styles.statusComplete,
        failed: styles.statusFailed,
    };

    return (
        <span className={`${styles.statusBadge} ${classMap[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export function BatchList({ batches, isLoading, refetch }: BatchListProps) {
    const hasActive = batches.some(
        (b) => b.status === 'pending' || b.status === 'processing',
    );

    useEffect(() => {
        if (!hasActive) return;

        const interval = setInterval(() => {
            refetch();
        }, 3000);

        return () => clearInterval(interval);
    }, [hasActive, refetch]);

    if (isLoading) {
        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Your Batches</h2>
                <div className={styles.list}>
                    <div className={styles.skeleton} />
                    <div className={styles.skeleton} />
                    <div className={styles.skeleton} />
                </div>
            </section>
        );
    }

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your Batches</h2>
            {batches.length === 0 ? (
                <p className={styles.empty}>No batches yet. Submit your first batch above.</p>
            ) : (
                <div className={styles.list}>
                    {batches.map((batch) => {
                        const progressPct =
                            batch.total_items > 0
                                ? Math.round((batch.completed_items / batch.total_items) * 100)
                                : 0;

                        return (
                            <Link key={batch.id} href={`/batches/${batch.id}`} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <StatusBadge status={batch.status} />
                                    <span className={styles.meta}>{formatDate(batch.created_at)}</span>
                                </div>
                                <p className={styles.meta}>
                                    {batch.total_items} item{batch.total_items !== 1 ? 's' : ''} (
                                    {batch.completed_items} complete, {batch.failed_items} failed)
                                </p>
                                {(batch.status === 'pending' || batch.status === 'processing') && (
                                    <div className={styles.progress}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
