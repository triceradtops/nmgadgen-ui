"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Menu, ChevronRight, Video } from "lucide-react";
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

    const updateJobState = (taskId: string, updates: Partial<BatchJob>) => {
        setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { ...job, ...updates } : job));
    };

    const pollResults = async (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/video/${taskId}`);
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
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            updateJobState(taskId, { status: 'FAILED' });
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
        const payload = {
            // Supply a synthetic black 1x1 base pixel to bypass image pipeline constraint, driving generation entirely from the animation_prompt
            image_url: "https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png",
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
                const tasks = data.task_data.list || [];
                const newJobs = tasks.map((t: any) => ({
                    taskId: t.task_id,
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

                    <div className="h-8 w-px bg-gray-800 mx-2 hidden lg:block"></div>

                    <nav className="hidden lg:flex gap-3">
                        <Link href="/symphony">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Avatars</Button>
                        </Link>
                        <Link href="/symphony/stock-video">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Stock Editor</Button>
                        </Link>
                        <Link href="/symphony/image-animation">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Image Animation</Button>
                        </Link>
                        <Link href="/symphony/text-to-video">
                            <Button variant="ghost" className="text-teal-400 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 hover:text-teal-300 font-mono text-xs uppercase tracking-wider h-9 shrink-0">Text to Video</Button>
                        </Link>
                    </nav>
                </div>
                <div className="flex gap-2">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm border border-gray-800 bg-gray-900/50 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_ADS ]
                    </Link>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
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
                                    disabled={loading || !textPrompt.trim()}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-wider text-xs h-10 rounded-md transition-all mt-6 disabled:opacity-50"
                                >
                                    {loading ? 'Synthesizing...' : 'Generate Text-To-Video'}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Dashboard Area */}
                <div className="flex-1 bg-black p-6 overflow-y-auto">
                    {batchJobs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 border-2 border-dashed border-gray-900 rounded-xl">
                            <Video size={48} className="opacity-20" />
                            <p className="font-mono text-xs tracking-widest uppercase shadow-sm">Draft a prompt to synthesize</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                            {batchJobs.map(job => (
                                <Card key={job.taskId} className="bg-[#111] border-gray-800 flex flex-col overflow-hidden">
                                    <div className="flex-1 bg-black relative max-h-[500px] flex items-center justify-center border-b border-gray-800 aspect-[9/16] group">
                                        {job.status === 'SUCCESS' && job.videoUrl ? (
                                            <video 
                                                controls 
                                                autoPlay 
                                                loop 
                                                muted
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            >
                                                <source src={job.videoUrl} type="video/mp4" />
                                            </video>
                                        ) : job.status === 'FAILED' ? (
                                            <div className="h-48 flex flex-col p-4 text-center items-center justify-center text-red-500 font-mono text-xs uppercase tracking-widest w-full bg-red-950/10 gap-2 overflow-y-auto">
                                                <span>Generation Failed</span>
                                                {job.errorDetails && <span className="text-[10px] lowercase text-red-400 opacity-60 break-all">{job.errorDetails}</span>}
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 z-10 font-mono text-xs flex flex-col items-center justify-center gap-4 w-full text-teal-500 bg-[#0a0a0a]">
                                                {/* Replicate the circular progress from the screenshot */}
                                                <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-teal-900 overflow-hidden">
                                                    <div className="absolute inset-0" style={{background: `conic-gradient(from 0deg, #14b8a6 20%, transparent 20%)`}}></div>
                                                    <div className="absolute inset-1 bg-[#0a0a0a] rounded-full flex flex-col items-center justify-center">
                                                        <span className="text-gray-200 text-sm font-sans tracking-tight">12%</span>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-semibold text-gray-300">Generating...</p>
                                                    <p className="text-[10px] text-gray-500 mt-1 max-w-[80%] mx-auto font-sans leading-tight">This may take 1-2 min. You can leave this page and come back later.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-[#111]">
                                        <div className="flex justify-between items-center bg-[#0a0a0a] rounded px-2 py-1.5 border border-gray-800">
                                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]" title={job.promptText}>{job.promptText}</span>
                                            {job.status === 'PROCESSING' ? (
                                                <RenderTimer startedAt={job.startedAt} />
                                            ) : (
                                                <span className={`font-mono text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded shrink-0 ml-2 ${job.status === 'SUCCESS' ? 'text-teal-400 bg-teal-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                                    {job.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
