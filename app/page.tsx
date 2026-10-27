'use client';
import dynamic from 'next/dynamic';

const Garden = dynamic(() => import('../components/Garden'), { ssr: false, loading: () => <div style={{padding: 40}}>Opening your garden…</div> });
export default function Page() { return <Garden />; }
