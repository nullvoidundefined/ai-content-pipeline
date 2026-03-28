'use client';

import { useState } from 'react';

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

export function BatchSubmitForm({ onSuccess }: BatchSubmitFormProps) {
    const [items, setItems] = useState<FormItem[]>([createItem()]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function addItem() {
        if (items.length >= 50) return;
        setItems((prev) => [...prev, createItem()]);
    }

    function removeItem(id: string) {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }

    function updateItemType(id: string, type: 'url' | 'text') {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, type } : item)));
    }

    function updateItemValue(id: string, value: string) {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const validItems = items.filter((item) => item.value.trim() !== '');
        if (validItems.length === 0) {
            setError('Add at least one item before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/batches', {
                items: validItems.map((item) => ({
                    type: item.type,
                    ...(item.type === 'url' ? { url: item.value.trim() } : { text: item.value.trim() }),
                })),
            });
            setItems([createItem()]);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit batch.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.header}>
                <span className={styles.title}>Submit a Batch</span>
            </div>

            <div className={styles.itemList}>
                {items.map((item) => (
                    <div key={item.id} className={styles.itemRow}>
                        <div className={styles.typeToggle}>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${item.type === 'url' ? styles.typeBtnActive : ''}`}
                                onClick={() => updateItemType(item.id, 'url')}
                            >
                                URL
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${item.type === 'text' ? styles.typeBtnActive : ''}`}
                                onClick={() => updateItemType(item.id, 'text')}
                            >
                                Text
                            </button>
                        </div>
                        <input
                            className={styles.itemInput}
                            type={item.type === 'url' ? 'url' : 'text'}
                            placeholder={item.type === 'url' ? 'https://example.com/article' : 'Paste text to process…'}
                            value={item.value}
                            onChange={(e) => updateItemValue(item.id, e.target.value)}
                        />
                        <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removeItem(item.id)}
                            aria-label="Remove item"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                className={styles.addItemBtn}
                onClick={addItem}
                disabled={items.length >= 50}
            >
                + Add item
            </button>

            <div className={styles.footer}>
                {error ? <span className={styles.errorMsg}>{error}</span> : <span />}
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit Batch'}
                </button>
            </div>
        </form>
    );
}
