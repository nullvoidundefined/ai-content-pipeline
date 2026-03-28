'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Batch } from '@/types';
import BatchSubmitForm from '@/components/BatchSubmitForm/BatchSubmitForm';
import BatchList from '@/components/BatchList/BatchList';

import styles from './dashboard.module.scss';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['batches'],
        queryFn: () => api.get<{ batches: Batch[] }>('/batches'),
        enabled: !!user,
    });

    const handleBatchCreated = () => {
        queryClient.invalidateQueries({ queryKey: ['batches'] });
    };

    if (!user) return null;

    return (
        <div className={styles.page}>
            <div className={styles.section}>
                <h1 className={styles.pageTitle}>Content Pipeline</h1>
                <p className={styles.pageSubtitle}>
                    Submit URLs or text for AI-powered summarization and tagging.
                </p>
            </div>
            <BatchSubmitForm onSuccess={handleBatchCreated} />
            <BatchList
                batches={data?.batches ?? []}
                isLoading={isLoading}
                refetch={refetch}
            />
        </div>
    );
}
