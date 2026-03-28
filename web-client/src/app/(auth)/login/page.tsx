'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';

import styles from '../auth.module.scss';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
                await login(email, password);
                router.push('/dashboard');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Login failed');
            } finally {
                setLoading(false);
            }
        },
        [email, password, login, router],
    );

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Log in to your AI Pipeline account</p>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            className={styles.input}
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            className={styles.input}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className={styles.errorMessage}>{error}</p>}
                    <button className={styles.primaryButton} type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>
                <p className={styles.footer}>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className={styles.footerLink}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
