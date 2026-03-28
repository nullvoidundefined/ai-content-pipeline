'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Batch, BatchStatus } from '@/types';
import Link from 'next/link';

import styles from './BatchList.module.scss';

interface BatchListProps {
  batches: Batch[];
  isLoading: boolean;
  refetch: () => void;
}

type FilterValue = 'all' | BatchStatus;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Complete', value: 'complete' },
  { label: 'Failed', value: 'failed' },
];

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

export default function BatchList({
  batches,
  isLoading,
  refetch,
}: BatchListProps) {
  const [filter, setFilter] = useState<FilterValue>('all');

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

  const filtered =
    filter === 'all' ? batches : batches.filter((b) => b.status === filter);

  const handleFilter = useCallback((value: FilterValue) => {
    setFilter(value);
  }, []);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Your Batches</h2>

      <div
        className={styles.filterTabs}
        role='tablist'
        aria-label='Filter batches by status'
      >
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            type='button'
            role='tab'
            aria-selected={filter === value}
            className={`${styles.filterTab} ${filter === value ? styles.filterTabActive : ''}`}
            onClick={() => handleFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          {filter === 'all'
            ? 'No batches yet. Submit your first batch above.'
            : `No ${filter} batches.`}
        </p>
      ) : (
        <div className={styles.list}>
          {filtered.map((batch) => {
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
