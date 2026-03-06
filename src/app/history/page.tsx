"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from 'next/link';

export default function HistoryPage() {
    const [accessCode, setAccessCode] = useState("");
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        if (!accessCode) {
            setError("Please enter your team access code.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/history?limit=50", {
                headers: { "x-access-code": accessCode }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("Invalid access code.");
                }
                throw new Error("Failed to load history.");
            }

            const data = await res.json();
            if (data.data) {
                setHistory(data.data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-[family-name:var(--font-geist-sans)]">
            <div className="flex justify-between items-center bg-[#111] border-b border-gray-800 px-6 py-3 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-gray-100 leading-none">NMG Ad Gen</h1>
                        <p className="text-gray-500 text-xs mt-1 font-mono uppercase tracking-wider">Omni-Channel Generative Ad Engine</p>
                    </div>
                </div>
                <div>
                    <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm border border-indigo-900/50 bg-indigo-900/10 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_CONSOLE ]
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 pt-12">
                <header className="mb-12 border-b border-white/10 pb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent mb-2">
                            Generation Library
                        </h1>
                        <p className="text-zinc-400">View past campaigns and retrieve previously generated ad creatives.</p>
                    </div>
                    <div className="flex gap-4">
                        <Input
                            type="password"
                            placeholder="Team Access Code"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            className="bg-[#111] border-gray-800 text-white w-64 font-mono text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                        />
                        <Button onClick={fetchHistory} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono uppercase tracking-widest border-0">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Library"}
                        </Button>
                    </div>
                </header>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg mb-8">
                        {error}
                    </div>
                )}

                {!loading && history.length === 0 && !error && (
                    <div className="text-center py-20 text-zinc-500">
                        <p>No history found. Enter your access code and click load.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-12">
                    {history.map((job) => (
                        <div key={job.job_id} className="bg-zinc-900/50 rounded-xl p-8 border border-white/10 shadow-2xl">
                            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        {job.campaign_goal || "Unknown Campaign"}
                                    </h2>
                                    <p className="text-sm text-zinc-400">
                                        Target: {job.target_audience || "Broad"} | Job ID: <span className="font-mono text-zinc-500">{job.job_id}</span>
                                    </p>
                                </div>
                                <span className="text-xs text-zinc-500 font-mono">
                                    {job.created_at ? new Date(job.created_at).toLocaleString() : "Date Unknown"}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {job.results?.map((ad: any, idx: number) => (
                                    <div key={idx} className="bg-black/50 rounded-lg overflow-hidden border border-white/5 flex flex-col">
                                        <div className="p-3 bg-zinc-800/50 flex justify-between items-center border-b border-white/5">
                                            <span className="text-xs font-semibold text-zinc-300">{ad.platform}</span>
                                            <span className="text-xs text-zinc-500 font-mono">{ad.format}</span>
                                        </div>
                                        <div className="relative aspect-square w-full bg-zinc-900">
                                            {ad.media_url ? (
                                                <img
                                                    src={ad.media_url}
                                                    alt={ad.headline}
                                                    className="object-cover w-full h-full"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-sm">
                                                    Image Unavailable
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-5 flex flex-col flex-1">
                                            <h3 className="font-bold text-lg text-white mb-2 leading-tight">
                                                {ad.headline}
                                            </h3>
                                            <p className="text-sm text-zinc-400 leading-relaxed font-serif">
                                                {ad.body_copy}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
