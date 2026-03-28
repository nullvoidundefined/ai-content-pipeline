'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '@/lib/api';

import styles from './BatchSubmitForm.module.scss';

interface FormItem {
    id: string;
    type: 'url' | 'text';
    value: string;
}

interface BatchSubmitFormProps {
    onSuccess: () => void;
}

function createItem(): FormItem {
    return { id: crypto.randomUUID(), type: 'url', value: '' };
}

export default function BatchSubmitForm({ onSuccess }: BatchSubmitFormProps) {
    const [items, setItems] = useState<FormItem[]>([createItem()]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const addItem = useCallback(() => {
        if (items.length >= 50) return;
        setItems((prev) => [...prev, createItem()]);
    }, [items.length]);

    const removeItem = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const updateItem = useCallback(
        (id: string, changes: Partial<Omit<FormItem, 'id'>>) => {
            setItems((prev) =>
                prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
            );
        },
        [],
    );

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
                const payload = {
                    items: items.map((item) =>
                        item.type === 'url'
                            ? { type: 'url' as const, url: item.value }
                            : { type: 'text' as const, text: item.value },
                    ),
                };
                await api.post('/batches', payload);
                setItems([createItem()]);
                onSuccess();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to submit batch');
            } finally {
                setLoading(false);
            }
        },
        [items, onSuccess],
    );

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.header}>
                <h2 className={styles.title}>New Batch</h2>
                <span className={styles.count}>
                    {items.length} / 50 items
                </span>
            </div>
            <div className={styles.itemList}>
                {items.map((item) => (
                    <div key={item.id} className={styles.itemRow}>
                        <div className={styles.typeToggle}>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${item.type === 'url' ? styles.typeBtnActive : ''}`}
                                onClick={() => updateItem(item.id, { type: 'url' })}
                            >
                                URL
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${item.type === 'text' ? styles.typeBtnActive : ''}`}
                                onClick={() => updateItem(item.id, { type: 'text' })}
                            >
                                Text
                            </button>
                        </div>
                        {item.type === 'url' ? (
                            <input
                                className={styles.itemInput}
                                type="url"
                                placeholder="https://example.com/article"
                                value={item.value}
                                onChange={(e) => updateItem(item.id, { value: e.target.value })}
                                required
                            />
                        ) : (
                            <textarea
                                className={`${styles.itemInput} ${styles.itemTextarea}`}
                                placeholder="Paste text content to analyze..."
                                value={item.value}
                                onChange={(e) => updateItem(item.id, { value: e.target.value })}
                                required
                                rows={3}
                            />
                        )}
                        {items.length > 1 && (
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => removeItem(item.id)}
                                aria-label="Remove item"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.addItemBtn}
                    onClick={addItem}
                    disabled={items.length >= 50}
                >
                    + Add item
                </button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Batch'}
                </button>
            </div>
        </form>
    );
}
