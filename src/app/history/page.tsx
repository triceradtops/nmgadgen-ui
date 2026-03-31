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
    const [prompts, setPrompts] = useState<Record<string, { loading: boolean, data: any, error?: string }>>({});
    
    // Pagination & Modal State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [activeAd, setActiveAd] = useState<any | null>(null);

    const fetchPrompts = async (resultId: string) => {
        if (!resultId || prompts[resultId]?.data || prompts[resultId]?.loading) return;

        setPrompts(prev => ({ ...prev, [resultId]: { loading: true, data: null } }));
        try {
            const res = await fetch(`/api/prompts/${resultId}`, {
                headers: { "x-access-code": accessCode }
            });
            if (!res.ok) throw new Error("Failed to load prompts");
            const data = await res.json();

            if (!data || (!data.claude_prompt && !data.gemini_prompt)) {
                setPrompts(prev => ({
                    ...prev, [resultId]: {
                        loading: false, data: {
                            claude_prompt: "No audit log available for this legacy generation.",
                            gemini_prompt: "No audit log available for this legacy generation."
                        }
                    }
                }));
                return;
            }

            setPrompts(prev => ({ ...prev, [resultId]: { loading: false, data } }));
        } catch (err: any) {
            setPrompts(prev => ({ ...prev, [resultId]: { loading: false, data: null, error: err.message } }));
        }
    };

    const fetchHistory = async (targetPage = 0) => {
        if (!accessCode) {
            setError("Please enter your team access code.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/history?limit=100&offset=${targetPage * 100}`, {
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
                // Flatten the nested job -> results
                const flattened: any[] = [];
                data.data.forEach((job: any) => {
                    if (job.results) {
                        job.results.forEach((ad: any) => {
                            flattened.push({
                                ...ad,
                                job_id: job.job_id,
                                campaign_goal: job.campaign_goal,
                                target_audience: job.target_audience,
                                created_at: job.created_at
                            });
                        });
                    }
                });
                setHistory(flattened);
                setPage(targetPage);
                setHasMore(data.count === 100);
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
                            onKeyDown={(e) => e.key === 'Enter' && fetchHistory(0)}
                        />
                        <Button onClick={() => fetchHistory(0)} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono uppercase tracking-widest border-0">
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

                <div className="flex flex-col gap-4">
                    {history.map((ad, idx) => (
                        <div key={`${ad.job_id}-${idx}`} className="bg-zinc-900/50 rounded-lg p-4 border border-white/10 shadow hover:bg-zinc-800/50 transition-colors flex items-center justify-between gap-6 cursor-pointer" onClick={() => setActiveAd(ad)}>
                            {/* Left: Thumbnail */}
                            <div className="shrink-0 w-24 h-24 bg-black rounded overflow-hidden flex items-center justify-center border border-white/5 relative group">
                                {ad.media_url?.endsWith('.mp4') ? (
                                    <video src={ad.media_url} className="w-full h-full object-cover" muted loop preload="metadata" />
                                ) : ad.media_url?.endsWith('.mp3') ? (
                                    <div className="w-full text-zinc-500 font-mono text-[10px] text-center">AUDIO</div>
                                ) : ad.media_url ? (
                                    <img src={ad.media_url} alt={ad.headline} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                    <span className="text-[10px] text-zinc-600">N/A</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                </div>
                            </div>
                            
                            {/* Middle: Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-xs font-mono text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">{ad.platform || "GENERAL"}</span>
                                    <span className="text-xs text-zinc-500 font-mono shrink-0">{ad.created_at ? new Date(ad.created_at).toLocaleDateString() : 'N/A'}</span>
                                    <span className="text-xs text-zinc-600 font-mono truncate hidden md:inline-block max-w-[200px]">{ad.campaign_goal}</span>
                                </div>
                                <h3 className="font-bold text-white text-base truncate mb-1">{ad.headline || "Untitled Ad"}</h3>
                                <p className="text-sm text-zinc-400 truncate font-serif">{ad.body_copy}</p>
                            </div>
                            
                            {/* Right: Actions */}
                            <div className="shrink-0 text-right hidden sm:block">
                                <Button className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 border-0" onClick={(e) => { e.stopPropagation(); setActiveAd(ad); }}>
                                    View Details
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {!loading && history.length > 0 && (
                    <div className="mt-12 flex justify-center items-center gap-6">
                        <Button 
                            disabled={page === 0 || loading} 
                            onClick={() => fetchHistory(page - 1)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white border-0 font-mono uppercase tracking-widest text-xs px-6"
                        >
                            &larr; Prev
                        </Button>
                        <span className="text-zinc-500 font-mono text-sm">Page {page + 1}</span>
                        <Button 
                            disabled={!hasMore || loading} 
                            onClick={() => fetchHistory(page + 1)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white border-0 font-mono uppercase tracking-widest text-xs px-6"
                        >
                            Next &rarr;
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {activeAd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setActiveAd(null)}>
                    <div className="bg-[#111] max-w-4xl w-full rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        
                        {/* Media Pane */}
                        <div className="w-full md:w-1/2 bg-black shrink-0 relative flex flex-col justify-center border-r border-white/10">
                            {activeAd.media_url?.endsWith('.mp4') ? (
                                <video src={activeAd.media_url} controls className="w-full max-h-[90vh] object-contain" autoPlay muted={false} />
                            ) : activeAd.media_url?.endsWith('.mp3') ? (
                                <div className="p-8 text-center flex flex-col items-center">
                                    <div className="text-zinc-500 uppercase tracking-widest font-mono text-xs mb-4">Audio Voiceover</div>
                                    <audio src={activeAd.media_url} controls className="w-full" autoPlay />
                                </div>
                            ) : activeAd.media_url ? (
                                <img src={activeAd.media_url} className="w-full h-[90vh] object-contain" alt="" />
                            ) : (
                                <div className="text-zinc-600 text-sm w-full text-center h-[300px] flex items-center justify-center">No Media</div>
                            )}
                        </div>
                        
                        {/* Details Pane */}
                        <div className="w-full md:w-1/2 p-8 overflow-y-auto">
                            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                                <div className="pr-4">
                                    <span className="text-xs font-mono text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded uppercase tracking-wider block w-max mb-3">
                                        {activeAd.platform || "GENERAL"} • {activeAd.format || "STATIC"}
                                    </span>
                                    <h2 className="text-2xl font-bold text-white leading-tight">{activeAd.headline}</h2>
                                    <p className="text-zinc-500 text-xs font-mono mt-3">Job ID: {activeAd.job_id}</p>
                                </div>
                                <button className="text-zinc-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" onClick={() => setActiveAd(null)}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            
                            <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white mb-2">Body Copy</h3>
                            <p className="text-sm text-zinc-300 font-serif leading-relaxed mb-8 bg-black/30 p-4 rounded border border-white/5 whitespace-pre-wrap">
                                {activeAd.body_copy || "No copy provided."}
                            </p>
                            
                            <details className="mt-4 border-t border-white/10 pt-4" onToggle={(e) => {
                                if ((e.target as HTMLDetailsElement).open && activeAd.result_id) fetchPrompts(activeAd.result_id);
                            }}>
                                <summary className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-mono font-semibold uppercase tracking-wider mb-2 select-none inline-flex items-center">
                                    [ View Prompt Audit Log ]
                                </summary>
                                <div className="bg-[#0a0a0a] border border-gray-800 rounded p-4 mt-3">
                                    {prompts[activeAd.result_id]?.loading ? (
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Fetching logs...
                                        </div>
                                    ) : prompts[activeAd.result_id]?.data ? (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Copywriter Intel (Claude)</h4>
                                                <pre className="text-[10px] text-gray-300 font-mono bg-[#111] p-3 rounded overflow-x-auto whitespace-pre-wrap border border-gray-800 max-h-48 scrollbar-thin">
                                                    {prompts[activeAd.result_id].data.claude_prompt || "No prompt recorded"}
                                                </pre>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Asset Synthesis (Gemini)</h4>
                                                <pre className="text-[10px] text-gray-300 font-mono bg-[#111] p-3 rounded overflow-x-auto whitespace-pre-wrap border border-gray-800 max-h-48 scrollbar-thin">
                                                    {prompts[activeAd.result_id].data.gemini_prompt || "No prompt recorded"}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500 text-xs font-mono">{prompts[activeAd.result_id]?.error || "Initialization pending..."}</div>
                                    )}
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
