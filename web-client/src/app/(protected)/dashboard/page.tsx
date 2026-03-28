'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Batch } from '@/types';
import { BatchSubmitForm } from '@/components/BatchSubmitForm/BatchSubmitForm';
import { BatchList } from '@/components/BatchList/BatchList';

import styles from './dashboard.module.scss';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['batches'],
        queryFn: () => api.get<{ batches: Batch[] }>('/batches'),
        enabled: !!user,
    });

    if (loading || (!user && !loading)) {
        return null;
    }

    const batches = data?.batches ?? [];

    return (
        <div className={styles.page}>
            <BatchSubmitForm onSuccess={() => refetch()} />
            <BatchList batches={batches} isLoading={isLoading} refetch={refetch} />
        </div>
    );
}
