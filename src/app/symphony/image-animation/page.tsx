"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Square, ChevronLeft, Menu, Video, ChevronRight, UploadCloud, ImageIcon, Terminal, Loader2, User, FileVideo, RefreshCw } from "lucide-react";
import Link from 'next/link';

interface BatchJob {
    taskId: string;
    imageUrl: string;
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    videoUrl?: string;
    errorDetails?: string;
    startedAt: number;
}

const RenderTimer = ({ startedAt }: { startedAt: number }) => {
    const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
    useEffect(() => {
        const int = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => clearInterval(int);
    }, [startedAt]);
    
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return <span className="text-teal-500 font-mono text-[10px] tabular-nums mt-2 border border-teal-900/50 bg-teal-900/20 px-2 py-0.5 rounded">T+{mins}:{secs.toString().padStart(2, '0')}</span>;
};

export default function ImageAnimationStudio() {
    const [loading, setLoading] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form Inputs
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [backgroundPrompt, setBackgroundPrompt] = useState("");
    const [animationPrompt, setAnimationPrompt] = useState("");
    
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        "> [TIKTOK_SYMPHONY] Neural Engine Initialized...",
        `[${new Date().toLocaleTimeString()}] Ready for Image-to-Video ingestion.`
    ]);

    const updateJobState = (taskId: string, updates: Partial<BatchJob>) => {
        setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { ...job, ...updates } : job));
    };

    const pollResults = async (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/video/${taskId}?aigc_video_type=IMAGE_ANIMATION`);
                if (res.status === 200) {
                    const data = await res.json();
                    const tasks = data.list || [];
                    
                    if (tasks.length > 0) {
                        const t = tasks[0];
                        if (t.status === "SUCCESS") {
                            updateJobState(taskId, {
                                status: 'SUCCESS',
                                videoUrl: t.preview_url || t.video_url || t.avatar_video_id,
                            });
                            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Task ${taskId} Synthesized Successfully.`]);
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            updateJobState(taskId, { status: 'FAILED' });
                            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ERROR: Task ${taskId} FAILED rendering.`]);
                            clearInterval(interval);
                        }
                    } else if (data.detail && String(data.detail).includes("API Error")) {
                         updateJobState(taskId, { status: 'FAILED' });
                         clearInterval(interval);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 5000);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: {
                    "x-access-code": localStorage.getItem("site_access_code") || process.env.NEXT_PUBLIC_ACCESS_CODE || "nmg_super_secret_2026",
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    setImageUrl(data.url);
                } else {
                    alert("Upload failed. Missing S3 URL mapping.");
                }
            } else {
                alert(`Upload blocked: Status ${res.status}`);
            }
        } catch (error) {
            alert("Network routing error pushing securely to buckets.");
        } finally {
            setUploading(false);
            setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Image uploaded and securely mounted.`]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleGenerate = async () => {
        if (!imageUrl) {
            alert("Mandatory structural constraint: Seed Image URL is empty.");
            return;
        }
        
        setLoading(true);
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Dispatching generation request to Symphony Model...`]);
        const payload = {
            image_url: imageUrl,
            background_prompt: backgroundPrompt.trim() || undefined,
            animation_prompt: animationPrompt.trim() || undefined,
            provider_model: "Turing", // Based on generic symphony architecture bounds
            video_generation_count: 1
        };

        try {
            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/image-to-video/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.status === 202 && data.status === "accepted") {
                const tasks = data.task_data?.list || data.task_data?.task_ids || (data.task_data?.task_id ? [data.task_data.task_id] : []);
                const newJobs = tasks.map((t: any) => ({
                    taskId: t.task_id || t,
                    imageUrl,
                    status: 'PROCESSING',
                    startedAt: Date.now()
                }));
                
                setBatchJobs(prev => [...prev, ...newJobs]);
                setLoading(false);
                
                newJobs.forEach((job: any) => pollResults(job.taskId));
            } else {
                setBatchJobs(prev => [...prev, {
                    taskId: `fail_api_${Date.now()}`,
                    imageUrl,
                    status: 'FAILED',
                    errorDetails: data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : "Immediate API Pipeline Reject",
                    startedAt: Date.now()
                }]);
                setLoading(false);
            }
        } catch (e) {
            setBatchJobs(prev => [...prev, {
                taskId: `fail_net_${Date.now()}`,
                imageUrl,
                status: 'FAILED',
                errorDetails: "Network failure calling the animation orchestrator.",
                startedAt: Date.now()
            }]);
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-[#0a0a0a] text-gray-300 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center bg-[#111] border-b border-gray-800 px-6 py-3 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsConfigOpen(!isConfigOpen)}
                            className="p-2 bg-[#0a0a0a] hover:bg-gray-800 rounded-md transition-colors text-gray-400 border border-gray-800"
                        >
                            {isConfigOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-teal-400 leading-none">NMG Symphony</h1>
                            <p className="text-gray-500 text-xs mt-1 font-mono uppercase tracking-wider">TikTok Generative API Control</p>
                        </div>
                    </div>

                </div>
                <div className="flex gap-2">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm border border-gray-800 bg-gray-900/50 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_ADS ]
                    </Link>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Permanent Tool Switcher Rail */}
                <div className="w-16 bg-[#111] border-r border-gray-800 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
                    <Link href="/symphony" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <User size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Avatars
                        </span>
                    </Link>
                    <Link href="/symphony/remixer" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <RefreshCw size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Remixer
                        </span>
                    </Link>
                    <Link href="/symphony/image-animation" className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] group relative transition-all">
                        <ImageIcon size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Image to Video
                        </span>
                    </Link>
                    <Link href="/symphony/text-to-video" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <FileVideo size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Text to Video
                        </span>
                    </Link>
                </div>

                {/* Configuration Sidebar */}
                <div className={`bg-[#111] border-r border-gray-800 overflow-y-auto scrollbar-thin transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm relative overflow-hidden group">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider">Seed Image Source</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 relative z-10">
                                <div className="space-y-2 relative">
                                    <div 
                                        className="h-32 border-2 border-dashed border-gray-700 bg-[#050505] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-950/10 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            ref={fileInputRef} 
                                            accept="image/*" 
                                            onChange={handleFileUpload}
                                        />
                                        {uploading ? (
                                            <div className="text-teal-500 font-mono text-xs flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full border-t-2 border-teal-500 animate-spin"></div>
                                                Uploading to Bucket...
                                            </div>
                                        ) : imageUrl ? (
                                            <div className="relative w-full h-full p-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={imageUrl} alt="preview" className="w-full h-full object-contain rounded-md" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                                                    <span className="text-white font-mono text-xs font-bold border border-white px-2 py-1 rounded">Change S3 Source Image</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud className="text-gray-500 mb-2 w-6 h-6" />
                                                <span className="font-mono text-xs text-gray-400 px-8 text-center uppercase tracking-wide">
                                                    Drop localized asset to automatically provision an S3 signed bucket mapping
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <Label className="font-bold text-gray-500 font-mono text-[10px] uppercase mt-2 block">Or Pass Direct HTTPS URL</Label>
                                    {imageUrl && imageUrl.includes("s3") ? (
                                        <div className="bg-[#0a0a0a] border border-gray-800 text-teal-500 font-mono text-xs px-3 py-2 rounded-md flex items-center justify-center bg-teal-950/20">
                                            [ S3 BUCKET MOUNTED SECURELY ]
                                        </div>
                                    ) : (
                                        <Input 
                                            value={imageUrl}
                                            onChange={e => setImageUrl(e.target.value)}
                                            placeholder="https://..." 
                                            style={{ color: "white", caretColor: "white" }}
                                            className="bg-[#0a0a0a] border-gray-700 font-mono text-xs text-teal-400 focus-visible:ring-teal-500" 
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 py-3">
                                <CardTitle className="text-sm font-mono uppercase tracking-wider">Cinematic Latents</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-[11px] uppercase">Environment/Set Design (Optional)</Label>
                                    <Textarea
                                        value={backgroundPrompt}
                                        onChange={e => setBackgroundPrompt(e.target.value)}
                                        rows={3}
                                        placeholder="E.g., A minimalist white marble pedestal inside a neon studio room..."
                                        style={{ color: "white", caretColor: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white text-xs font-sans focus-visible:ring-teal-500 resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-[11px] uppercase">Camera & Motion Operators (Optional)</Label>
                                    <Textarea
                                        value={animationPrompt}
                                        onChange={e => setAnimationPrompt(e.target.value)}
                                        rows={3}
                                        placeholder="E.g., Hard track left, fluid zoom toward the glowing product..."
                                        style={{ color: "white", caretColor: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-xs font-sans text-teal-300 focus-visible:ring-teal-500 resize-none"
                                    />
                                </div>

                                <Button 
                                    onClick={handleGenerate} 
                                    disabled={loading || !imageUrl}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-wider text-xs h-10 rounded-md transition-all mt-4 disabled:opacity-50"
                                >
                                    {loading ? 'Synthesizing...' : 'Ignite Animation Pipeline'}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Split Workspace Area */}
                <div className="flex-1 flex flex-col xl:flex-row overflow-hidden border-t border-gray-800 xl:border-t-0 bg-black">
                    <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A] xl:border-r border-gray-800">
                        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 scrollbar-thin scrollbar-thumb-gray-800">
                            <div className="max-w-[1800px] mx-auto space-y-6">
                                {batchJobs.length === 0 ? (
                                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-600 gap-4 border-2 border-dashed border-gray-900 rounded-xl">
                                        <ImageIcon size={48} className="opacity-20" />
                                        <p className="font-mono text-xs tracking-widest uppercase shadow-sm">Attach a Seed frame to begin</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {batchJobs.map(job => (
                                            <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/30' : job.status === 'FAILED' ? 'border-red-900/50' : 'border-gray-800'}`}>
                                                <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                    <div className="flex flex-col overflow-hidden mr-2">
                                                        <span className="text-teal-400 font-bold font-mono text-[10px] truncate flex items-center gap-2" title={job.taskId}>
                                                            ID_{job.taskId.slice(-8).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded bg-[#0a0a0a] border border-gray-800 flex items-center gap-1.5 shrink-0">
                                                        {job.status === 'PROCESSING' && <><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div><span className="text-yellow-500">Node</span></>}
                                                        {job.status === 'SUCCESS' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-green-400">Idle</span></>}
                                                        {job.status === 'FAILED' && <><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-red-500">Halt</span></>}
                                                    </div>
                                                </div>
                                                
                                                <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                                                    {job.status === 'SUCCESS' && job.videoUrl ? (
                                                        <video 
                                                            controls 
                                                            autoPlay 
                                                            loop 
                                                            muted
                                                            crossOrigin="anonymous"
                                                            className="w-full h-full object-cover rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/30"
                                                        >
                                                            <source src={job.videoUrl} type="video/mp4" />
                                                        </video>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-10 p-4 text-center">
                                                            {job.status === 'PROCESSING' && (
                                                                <div className="bg-black/90 p-5 rounded-xl border border-gray-800 flex flex-col items-center shadow-2xl shadow-black relative z-20">
                                                                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                                                                    <span className="text-teal-400 font-mono text-[10px] tracking-widest uppercase mb-1">Executing Matrix...</span>
                                                                    <RenderTimer startedAt={job.startedAt} />
                                                                </div>
                                                            )}
                                                            {job.status === 'FAILED' && (
                                                                <div className="bg-black/90 p-4 rounded-xl border border-red-900 flex flex-col items-center">
                                                                    <span className="text-red-500 font-bold font-mono text-[10px] uppercase mb-2">CRITICAL REJECTION</span>
                                                                    <span className="text-gray-400 font-mono text-[9px] break-words line-clamp-3 overflow-hidden">{job.errorDetails}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Terminal Sidebar */}
                    <div className="w-full md:w-[300px] xl:w-[350px] bg-[#0A0A0A] border-l border-gray-800 flex flex-col shrink-0">
                        <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0 text-gray-400">
                            <Terminal size={16} className="text-teal-500" />
                            <span className="text-xs font-mono font-bold tracking-wider uppercase">Symphony Terminal</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1">
                            {terminalLogs.map((log, i) => (
                                <div key={i} className={`${log.includes("ERROR") || log.includes("LIMIT") || log.includes("FAILED") ? 'text-red-400' : 'text-teal-400'}`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
