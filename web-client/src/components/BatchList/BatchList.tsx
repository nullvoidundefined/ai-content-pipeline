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
            {status}
        </span>
    );
}

export default function BatchList({ batches, isLoading, refetch }: BatchListProps) {
    const isActive = batches.some(
        (b) => b.status === 'pending' || b.status === 'processing',
    );

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            refetch();
        }, 3000);
        return () => clearInterval(interval);
    }, [isActive, refetch]);

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your Batches</h2>
            {isLoading ? (
                <div className={styles.list}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.skeleton} />
                    ))}
                </div>
            ) : batches.length === 0 ? (
                <p className={styles.empty}>No batches yet. Submit your first batch above.</p>
            ) : (
                <div className={styles.list}>
                    {batches.map((batch) => {
                        const progress =
                            batch.total_items > 0
                                ? (batch.completed_items / batch.total_items) * 100
                                : 0;
                        const showProgress =
                            batch.status === 'processing' || batch.status === 'pending';

                        return (
                            <Link
                                key={batch.id}
                                href={`/batches/${batch.id}`}
                                className={styles.card}
                            >
                                <div className={styles.cardHeader}>
                                    <StatusBadge status={batch.status} />
                                    <span className={styles.date}>
                                        {formatDate(batch.created_at)}
                                    </span>
                                </div>
                                <p className={styles.meta}>
                                    {batch.total_items} items &middot; {batch.completed_items}{' '}
                                    complete &middot; {batch.failed_items} failed
                                </p>
                                {showProgress && (
                                    <div className={styles.progress}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${progress}%` }}
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
