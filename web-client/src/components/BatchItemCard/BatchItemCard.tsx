'use client';

import type { BatchItem } from '@/types';

import styles from './BatchItemCard.module.scss';

interface BatchItemCardProps {
    item: BatchItem;
}

function StatusBadge({ status }: { status: BatchItem['status'] }) {
    const classMap: Record<BatchItem['status'], string> = {
        queued: styles.statusQueued,
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

function truncate(str: string, max: number): string {
    return str.length > max ? `${str.slice(0, max)}...` : str;
}

export default function BatchItemCard({ item }: BatchItemCardProps) {
    const preview =
        item.input_type === 'url'
            ? (item.input_url ?? '')
            : truncate(item.input_text ?? '', 80);

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.badges}>
                    <StatusBadge status={item.status} />
                    <span className={styles.typeBadge}>
                        {item.input_type.toUpperCase()}
                    </span>
                </div>
            </div>
            <p className={styles.inputPreview}>{preview}</p>

            {item.status === 'complete' && (
                <>
                    {item.summary && (
                        <div className={styles.summaryBox}>
                            <p className={styles.summaryText}>{item.summary}</p>
                        </div>
                    )}
                    {item.tags && item.tags.length > 0 && (
                        <div className={styles.tags}>
                            {item.tags.map((tag) => (
                                <span key={tag} className={styles.tag}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </>
            )}

            {item.status === 'failed' && item.error && (
                <p className={styles.errorMsg}>{item.error}</p>
            )}

            {(item.status === 'queued' || item.status === 'processing') && (
                <p className={styles.processingMsg}>Processing...</p>
            )}
        </div>
    );
}
