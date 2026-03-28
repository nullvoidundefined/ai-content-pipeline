export interface Batch {
    id: string;
    status: 'pending' | 'processing' | 'complete' | 'failed';
    total_items: number;
    completed_items: number;
    failed_items: number;
    created_at: string;
    completed_at: string | null;
}

export interface BatchItem {
    id: string;
    batch_id: string;
    input_type: 'url' | 'text';
    input_url: string | null;
    input_text: string | null;
    status: 'queued' | 'processing' | 'complete' | 'failed';
    tags: string[] | null;
    summary: string | null;
    error: string | null;
    attempts: number;
    processed_at: string | null;
    created_at: string;
}

export type BatchStatus = Batch['status'];
export type ItemStatus = BatchItem['status'];
