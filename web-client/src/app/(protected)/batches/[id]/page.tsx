'use client';

import { use, useEffect } from 'react';

import BatchItemCard from '@/components/BatchItemCard/BatchItemCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Batch, BatchItem } from '@/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './batchDetail.module.scss';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export default function BatchDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const { data: batchData } = useQuery({
    queryKey: ['batches', id],
    queryFn: () => api.get<{ batch: Batch }>(`/batches/${id}`),
    enabled: !!user,
    refetchInterval: (query) => {
      const batch = query.state.data?.batch;
      if (!batch) return false;
      return batch.status === 'pending' || batch.status === 'processing'
        ? 3000
        : false;
    },
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['batches', id, 'items'],
    queryFn: () => api.get<{ items: BatchItem[] }>(`/batches/${id}/items`),
    enabled: !!user,
    refetchInterval: (query) => {
      const batch = batchData?.batch;
      if (!batch) return false;
      return batch.status === 'pending' || batch.status === 'processing'
        ? 3000
        : false;
    },
  });

  if (!user) return null;

  const batch = batchData?.batch;
  const items = itemsData?.items ?? [];
  const progress =
    batch && batch.total_items > 0
      ? (batch.completed_items / batch.total_items) * 100
      : 0;
  const showProgress =
    batch?.status === 'processing' || batch?.status === 'pending';

  return (
    <div className={styles.page}>
      <Link href='/dashboard' className={styles.back}>
        ← Back to batches
      </Link>

      {batch ? (
        <>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              Batch{' '}
              <span className={styles.batchId}>{batch.id.slice(0, 8)}</span>
            </h1>
            <div className={styles.meta}>
              <StatusBadge status={batch.status} />
              <span className={styles.date}>
                {formatDate(batch.created_at)}
              </span>
            </div>
          </div>

          {showProgress && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className={styles.stats}>
            <span>
              Total:{' '}
              <strong className={styles.statValue}>{batch.total_items}</strong>
            </span>
            <span>
              Complete:{' '}
              <strong className={styles.statValue}>
                {batch.completed_items}
              </strong>
            </span>
            <span>
              Failed:{' '}
              <strong className={styles.statValue}>{batch.failed_items}</strong>
            </span>
          </div>

          <div className={styles.itemsSection}>
            {itemsLoading ? (
              <p className={styles.emptyItems}>Loading items...</p>
            ) : items.length === 0 ? (
              <p className={styles.emptyItems}>No items found.</p>
            ) : (
              items.map((item) => <BatchItemCard key={item.id} item={item} />)
            )}
          </div>
        </>
      ) : (
        <p className={styles.emptyItems}>Loading batch...</p>
      )}
    </div>
  );
}
