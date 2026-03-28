'use client';

import { useCallback, useState } from 'react';

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

function renderClassification(
    classification: Record<string, unknown>,
): string | null {
    if (typeof classification.category === 'string') {
        return classification.category;
    }
    if (typeof classification.label === 'string') {
        return classification.label;
    }
    if (typeof classification.type === 'string') {
        return classification.type;
    }
    const values = Object.values(classification).filter(
        (v) => typeof v === 'string',
    );
    return values.length > 0 ? String(values[0]) : null;
}

function renderEntities(entities: Record<string, unknown>): string[] {
    const result: string[] = [];
    for (const [, value] of Object.entries(entities)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === 'string') {
                    result.push(item);
                }
            }
        } else if (typeof value === 'string') {
            result.push(value);
        }
    }
    return result;
}

export default function BatchItemCard({ item }: BatchItemCardProps) {
    const [expanded, setExpanded] = useState(false);

    const preview =
        item.input_type === 'url'
            ? (item.input_url ?? '')
            : truncate(item.input_text ?? '', 80);

    const isComplete = item.status === 'complete';
    const hasEntities =
        isComplete &&
        item.entities != null &&
        Object.keys(item.entities).length > 0;
    const hasClassification =
        isComplete &&
        item.classification != null &&
        Object.keys(item.classification).length > 0;
    const summaryIsLong =
        isComplete && item.summary != null && item.summary.length > 200;
    const showToggle = hasEntities || summaryIsLong;

    const classificationLabel = hasClassification
        ? renderClassification(item.classification!)
        : null;
    const entityList = hasEntities ? renderEntities(item.entities!) : [];

    const handleToggle = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.badges}>
                    <StatusBadge status={item.status} />
                    <span className={styles.typeBadge}>
                        {item.input_type.toUpperCase()}
                    </span>
                    {classificationLabel && (
                        <span className={styles.classificationBadge}>
                            {classificationLabel}
                        </span>
                    )}
                </div>
            </div>
            <p className={styles.inputPreview}>{preview}</p>

            {isComplete && (
                <>
                    {item.summary && (
                        <div className={styles.summaryBox}>
                            <p className={styles.summaryText}>
                                {summaryIsLong && !expanded
                                    ? truncate(item.summary, 200)
                                    : item.summary}
                            </p>
                        </div>
                    )}

                    {item.tags && item.tags.length > 0 && (
                        <div className={styles.chipRow}>
                            {item.tags.map((tag) => (
                                <span key={tag} className={styles.tag}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {(expanded || !summaryIsLong) && entityList.length > 0 && (
                        <div className={styles.entitySection}>
                            <span className={styles.sectionLabel}>
                                Entities
                            </span>
                            <div className={styles.chipRow}>
                                {entityList.map((entity) => (
                                    <span
                                        key={entity}
                                        className={styles.entityChip}
                                    >
                                        {entity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {showToggle && (
                        <button
                            type="button"
                            className={styles.toggleBtn}
                            onClick={handleToggle}
                        >
                            {expanded ? 'Show less' : 'Show more'}
                        </button>
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
