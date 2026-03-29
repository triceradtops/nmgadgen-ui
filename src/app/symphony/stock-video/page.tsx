"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Square, ChevronLeft, Menu, Video, ChevronRight } from "lucide-react";
import Link from 'next/link';

interface BatchJob {
    taskId: string;
    productName: string;
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    videoUrl?: string;
    subtitleUrl?: string;
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

export default function StockVideoStudio() {
    const [loading, setLoading] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [voices, setVoices] = useState<any[]>([]);
    
    // Form Inputs
    const [productName, setProductName] = useState("");
    const [productDesc, setProductDesc] = useState("");
    const [sellingPoints, setSellingPoints] = useState("Durable\nAffordable\nPremium");
    const [voiceId, setVoiceId] = useState("");
    const [videoDuration, setVideoDuration] = useState("RECOMMENDED");
    
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/voices");
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data?.length > 0) {
                        setVoices(data.data.filter((v: any) => v.voice_id !== "None"));
                        setVoiceId(data.data.filter((v: any) => v.voice_id !== "None")[0]?.voice_id);
                    }
                }
            } catch (err) {}
        };
        fetchVoices();
    }, []);

    const playVoiceSample = (vidId: string, url: string) => {
        if (!url) return;
        if (playingVoiceId === vidId) {
            setPlayingVoiceId(null);
            return;
        }
        setPlayingVoiceId(vidId);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => setPlayingVoiceId(null);
    };

    const updateJobState = (taskId: string, updates: Partial<BatchJob>) => {
        setBatchJobs(prev => prev.map(job => job.taskId === taskId ? { ...job, ...updates } : job));
    };

    const pollResults = async (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                // Video status endpoint uses /status/video/{taskId}
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/video/${taskId}`);
                if (res.status === 200) {
                    const data = await res.json();
                    const tasks = data.list || [];
                    
                    if (tasks.length > 0) {
                        const t = tasks[0];
                        if (t.status === "SUCCESS") {
                            updateJobState(taskId, {
                                status: 'SUCCESS',
                                videoUrl: t.preview_url || t.video_url,
                                subtitleUrl: t.srt_file_url || t.subtitle_url || t.caption_url || null
                            });
                            setBatchJobs(current => current.map(job => job.taskId === taskId ? { ...job, status: 'SUCCESS' as const } : job));
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
        if (!productName.trim() || !productDesc.trim() || !voiceId) {
            alert("Empty descriptive properties blocked.");
            return;
        }
        
        setLoading(true);
        const points = sellingPoints.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 10);
        
        const payload = {
            aigc_video_type: "VOICEOVER",
            product_video_info: {
                video_generation_count: 1,
                target_language: "en",
                voice_id: voiceId,
                video_duration: videoDuration,
                subtitle_enabled: true,
                product_info_list: [{
                    product_name: productName.slice(0, 50),
                    product_description: productDesc.slice(0, 500),
                    product_selling_points: points.length ? points : ["Standard product"]
                }]
            }
        };

        try {
            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/remix/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok && data.status === "accepted") {
                const tasks = data.task_data?.list || data.task_data?.task_ids || (data.task_data?.task_id ? [data.task_data.task_id] : []);
                
                if (tasks.length > 0) {
                    const newJobs = tasks.map((t: any) => ({
                        taskId: t.task_id || t,
                        productName,
                        status: 'PROCESSING',
                        startedAt: Date.now()
                    }));
                    
                    setBatchJobs(prev => [...prev, ...newJobs]);
                    setLoading(false);
                    setProductName(""); // Clear UI buffer partially
                    
                    newJobs.forEach((job: any) => pollResults(job.taskId));
                } else {
                    setBatchJobs(prev => [...prev, {
                        taskId: `fail_api_silence_${Date.now()}`,
                        productName: productName.trim() || 'Unknown Target',
                        status: 'FAILED',
                        errorDetails: "TikTok accepted the request but generated no render tasks internally. Check text constraint limits.",
                        startedAt: Date.now()
                    }]);
                    setLoading(false);
                }
            } else {
                setBatchJobs(prev => [...prev, {
                    taskId: `fail_api_${Date.now()}`,
                    productName: productName.trim() || 'Unknown Target',
                    status: 'FAILED',
                    errorDetails: data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : "Immediate API Pipeline Reject",
                    startedAt: Date.now()
                }]);
                setLoading(false);
            }
        } catch (e) {
            setBatchJobs(prev => [...prev, {
                taskId: `fail_net_${Date.now()}`,
                productName: productName.trim() || 'Unknown Target',
                status: 'FAILED',
                errorDetails: "Network failure calling the creative remux coordinator.",
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
                            <Button variant="ghost" className="text-teal-400 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 hover:text-teal-300 font-mono text-xs uppercase tracking-wider h-9 shrink-0">Stock Editor</Button>
                        </Link>
                        <Link href="/symphony/image-animation">
                            <Button variant="ghost" className="text-gray-400 hover:bg-gray-800 hover:text-white font-mono text-xs uppercase tracking-wider h-9 transition-all shrink-0">Image Animation</Button>
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
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider">Stock Generation Specs</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Product Name</Label>
                                    <Input 
                                        value={productName}
                                        onChange={e => setProductName(e.target.value)}
                                        placeholder="e.g., Hydrating Serum" 
                                        style={{ color: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white font-mono text-sm focus-visible:ring-teal-500" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Description / Purpose</Label>
                                    <Textarea
                                        value={productDesc}
                                        onChange={e => setProductDesc(e.target.value)}
                                        rows={3}
                                        placeholder="A detailed sentence on what this product does..."
                                        style={{ color: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white text-sm font-sans focus-visible:ring-teal-500 resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Selling Points (Return separated)</Label>
                                    <Textarea
                                        value={sellingPoints}
                                        onChange={e => setSellingPoints(e.target.value)}
                                        rows={4}
                                        style={{ color: "white" }}
                                        className="bg-[#0a0a0a] border-gray-700 text-white text-xs font-mono focus-visible:ring-teal-500 resize-none whitespace-pre"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30 py-3">
                                <CardTitle className="text-sm font-mono uppercase tracking-wider">Audio & Tempo Binding</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <Label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Voice Synthesis</Label>
                                    <select 
                                        value={voiceId} 
                                        onChange={e => setVoiceId(e.target.value)} 
                                        style={{ color: "white" }}
                                        className="w-full h-10 px-3 rounded-md bg-[#0a0a0a] border border-gray-700 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value="" disabled>Select a voice</option>
                                        {voices.map((v, i) => (
                                            <option key={i} value={v.voice_id}>{v.voice_name || v.voice_id} - {v.voice_tags?.find((t: any) => t.tag_type === 'Gender')?.tag_name || 'Unknown'}</option>
                                        ))}
                                    </select>
                                    {voiceId && voices.find(v => v.voice_id === voiceId)?.preview_audio && (
                                        <button 
                                            onClick={() => playVoiceSample(voiceId, voices.find(v => v.voice_id === voiceId).preview_audio)}
                                            className="text-[10px] text-teal-500 mt-2 font-mono flex items-center gap-1 hover:text-teal-400 transition-colors"
                                        >
                                            {playingVoiceId === voiceId ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                                            {playingVoiceId === voiceId ? 'STOP PREVIEW' : 'PLAY PREVIEW'}
                                        </button>
                                    )}
                                </div>
                                
                                <div>
                                    <Label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Constraint Duration</Label>
                                    <select 
                                        value={videoDuration} 
                                        onChange={e => setVideoDuration(e.target.value)} 
                                        style={{ color: "white" }}
                                        className="w-full h-10 px-3 rounded-md bg-[#0a0a0a] border border-gray-700 text-sm font-mono text-gray-200 outline-none"
                                    >
                                        <option value="RECOMMENDED">AI Flexible</option>
                                        <option value="15S">Strict 15s</option>
                                        <option value="30S">Strict 30s</option>
                                    </select>
                                </div>

                                <Button 
                                    onClick={handleGenerate} 
                                    disabled={loading || !productName}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-wider text-xs h-10 rounded-md transition-all mt-4 disabled:opacity-50"
                                >
                                    {loading ? 'Synthesizing Request...' : 'Generate Text-to-Video'}
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
                            <p className="font-mono text-sm tracking-widest uppercase">No Active Render Nodes</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                            {batchJobs.map(job => (
                                <Card key={job.taskId} className="bg-[#111] border-gray-800 flex flex-col overflow-hidden">
                                    <div className="flex-1 bg-black relative max-h-[500px] flex items-center justify-center border-b border-gray-800">
                                        {job.status === 'SUCCESS' && job.videoUrl ? (
                                            <video 
                                                controls 
                                                autoPlay 
                                                loop 
                                                muted
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover max-h-[500px]"
                                            >
                                                <source src={job.videoUrl} type="video/mp4" />
                                                {job.subtitleUrl && (
                                                    <track 
                                                        kind="captions" 
                                                        src={job.subtitleUrl.endsWith('.srt') ? `/api/captions?url=${encodeURIComponent(job.subtitleUrl)}` : job.subtitleUrl} 
                                                        srcLang="en" 
                                                        label="English" 
                                                        default 
                                                    />
                                                )}
                                            </video>
                                        ) : job.status === 'FAILED' ? (
                                            <div className="h-48 flex flex-col p-4 text-center items-center justify-center text-red-500 font-mono text-xs uppercase tracking-widest w-full bg-red-950/10 gap-2 overflow-y-auto">
                                                <span>Generation Failed</span>
                                                {job.errorDetails && <span className="text-[10px] lowercase text-red-400 opacity-60 break-all">{job.errorDetails}</span>}
                                            </div>
                                        ) : (
                                            <div className="h-48 font-mono text-xs flex flex-col items-center justify-center gap-3 w-full animate-pulse text-teal-500">
                                                <div className="w-8 h-8 rounded-full border-t-2 border-teal-500 animate-spin"></div>
                                                Generating Base Vector...
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-[#111]">
                                        <div className="flex justify-between items-center bg-[#0a0a0a] rounded px-2 py-1.5 border border-gray-800">
                                            <span className="font-mono text-[10px] text-gray-500 truncate">{job.taskId}</span>
                                            {job.status === 'PROCESSING' ? (
                                                <RenderTimer startedAt={job.startedAt} />
                                            ) : (
                                                <span className={`font-mono text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded ${job.status === 'SUCCESS' ? 'text-teal-400 bg-teal-400/10' : 'text-red-400 bg-red-400/10'}`}>
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
