"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Menu, ChevronRight, Video, Loader2, Terminal, User, RefreshCw, ImageIcon, FileVideo } from "lucide-react";
import Link from 'next/link';

interface BatchJob {
    taskId: string;
    promptText: string;
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

export default function TextToVideoStudio() {
    const [loading, setLoading] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    
    // Form Inputs
    const [textPrompt, setTextPrompt] = useState("");
    const [providerModel, setProviderModel] = useState("Video 1.5 Fast");
    const [videoDuration, setVideoDuration] = useState("5s");
    
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        "> [TIKTOK_SYMPHONY] Neural Engine Initialized...",
        `[${new Date().toLocaleTimeString()}] Ready for prompt ingestion.`
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

    const handleGenerate = async () => {
        if (!textPrompt.trim()) {
            alert("Mandatory structural constraint: Text Prompt is empty.");
            return;
        }
        
        setLoading(true);
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] Dispatching generation request to Symphony Model...`]);
        const payload = {
            // Supply a synthetic portrait 1080x1920 black pixel image to strictly enforce a 9:16 generation outcome
            image_url: "https://dummyimage.com/1080x1920/000/000.png",
            animation_prompt: textPrompt.trim() || undefined,
            provider_model: providerModel === "Video 1.5 Fast" ? "Turing" : "Turing",
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
                    promptText: textPrompt.trim(),
                    status: 'PROCESSING',
                    startedAt: Date.now()
                }));
                
                setBatchJobs(prev => [...prev, ...newJobs]);
                setLoading(false);
                setTextPrompt(""); // Clear input on successful handoff
                
                newJobs.forEach((job: any) => pollResults(job.taskId));
            } else {
                setBatchJobs(prev => [...prev, {
                    taskId: `fail_api_${Date.now()}`,
                    promptText: textPrompt.trim(),
                    status: 'FAILED',
                    errorDetails: data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : "Immediate API Pipeline Reject",
                    startedAt: Date.now()
                }]);
                setLoading(false);
            }
        } catch (e) {
            setBatchJobs(prev => [...prev, {
                taskId: `fail_net_${Date.now()}`,
                promptText: textPrompt.trim(),
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
                    <Link href="/symphony/image-animation" className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent group relative transition-all">
                        <ImageIcon size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Image to Video
                        </span>
                    </Link>
                    <Link href="/symphony/text-to-video" className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] group relative transition-all">
                        <FileVideo size={20} />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            Text to Video
                        </span>
                    </Link>
                </div>

                {/* Configuration Sidebar */}
                <div className={`bg-[#111] border-r border-gray-800 overflow-y-auto scrollbar-thin transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 py-3">
                                <CardTitle className="text-sm font-mono uppercase tracking-wider">Text Composer</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-[11px] uppercase">Composition Prompt</Label>
                                    <Textarea
                                        value={textPrompt}
                                        onChange={e => setTextPrompt(e.target.value)}
                                        rows={6}
                                        placeholder="E.g., A medium shot shows a young Hispanic woman with long hair wearing a dark jacket standing near a painted wall in an urban alley..."
                                        style={{ color: "white", caretColor: "white", minHeight: "150px" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white text-xs font-sans focus-visible:ring-teal-500 resize-none"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-[11px] font-mono text-gray-400 uppercase mb-1 block">Video Model</Label>
                                        <select 
                                            value={providerModel} 
                                            onChange={e => setProviderModel(e.target.value)} 
                                            style={{ color: "white" }}
                                            className="w-full h-10 px-3 rounded-md bg-[#0a0a0a] border border-gray-700 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                                        >
                                            <option value="Video 1.5 Fast">Video 1.5 Fast</option>
                                            <option value="Symphony Legacy">Symphony Legacy</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-[11px] font-mono text-gray-400 uppercase mb-1 block">Constraint Duration</Label>
                                        <select 
                                            value={videoDuration} 
                                            onChange={e => setVideoDuration(e.target.value)} 
                                            style={{ color: "white" }}
                                            className="w-full h-10 px-3 rounded-md bg-[#0a0a0a] border border-gray-700 text-sm font-mono text-gray-200 flex-1 outline-none cursor-pointer"
                                        >
                                            <option value="5s">5s</option>
                                            <option value="10s">10s</option>
                                        </select>
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleGenerate} 
                                    disabled={loading}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-wider text-xs h-10 rounded-md transition-all mt-6 disabled:opacity-50"
                                >
                                    {loading ? 'Synthesizing...' : 'Generate Text-To-Video'}
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
                                        <Video size={48} className="opacity-20" />
                                        <p className="font-mono text-xs tracking-widest uppercase shadow-sm">Draft a prompt to synthesize</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {batchJobs.map(job => (
                                            <div key={job.taskId} className={`bg-[#0a0a0a] overflow-hidden rounded-xl border flex flex-col group relative transition-colors ${job.status === 'SUCCESS' ? 'border-teal-500/30' : job.status === 'FAILED' ? 'border-red-900/50' : 'border-gray-800'}`}>
                                                <div className="bg-[#111] border-b border-gray-800 px-3 py-2 flex justify-between items-center z-10">
                                                    <div className="flex flex-col overflow-hidden mr-2">
                                                        <span className="text-teal-400 font-bold font-mono text-[10px] truncate flex items-center gap-2" title={job.promptText}>
                                                            {job.promptText.substring(0, 40)}{job.promptText.length > 40 ? '...' : ''}
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
