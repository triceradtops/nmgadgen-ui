"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Menu, ChevronLeft, Terminal, Play, Video } from "lucide-react";
import Link from 'next/link';

export default function SymphonyStudio() {
    const [loading, setLoading] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<string[]>(["[TIKTOK_SYMPHONY] Neural Engine Initialized..."]);
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [accessCode, setAccessCode] = useState("");
    
    // Symphony Data
    const [avatars, setAvatars] = useState<any[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
    const [script, setScript] = useState("Hey, we finally implemented Symphony before the quarter ended!");
    
    // Result
    const [jobId, setJobId] = useState<string | null>(null);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

    const appendLog = (msg: string) => {
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Load Avatars on mount
    useEffect(() => {
        const fetchAvatars = async () => {
            appendLog("Fetching global Digital Avatar library from TikTok...");
            try {
                // Point to our fastAPI backend
                const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatars");
                const data = await res.json();
                if (data.status === "success" && data.data) {
                    setAvatars(data.data);
                    appendLog(`Successfully loaded ${data.data.length} avatars into the matrix.`);
                }
            } catch (err) {
                appendLog("ERROR: Failed to connect to TikTok API backend.");
            }
        };
        fetchAvatars();
    }, []);

    const handleGenerate = async () => {
        if (!selectedAvatarId) {
            alert("Please select an avatar first.");
            return;
        }
        
        setLoading(true);
        setJobId(null);
        setFinalVideoUrl(null);
        setTerminalLogs(["[SYSTEM] Generation Job Started..."]);
        setIsConfigOpen(false);

        try {
            appendLog(`Dispatching Avatar ID: ${selectedAvatarId}`);
            const payload = {
                material_packages: [{
                    avatar_id: selectedAvatarId,
                    script: script
                }]
            };

            const res = await fetch("https://web-production-1f2e2.up.railway.app/api/tiktok/avatar/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            
            // Extract the task ID depending on TikTok API's subtle task wrapping
            let createdTaskId = null;
            if (data.task_data?.list?.length > 0) {
                createdTaskId = data.task_data.list[0].task_id;
            } else if (data.task_data?.task_id) {
                createdTaskId = data.task_data.task_id;
            }

            if (createdTaskId) {
                appendLog(`Worker Job Dispatched. Task ID: ${createdTaskId}`);
                setJobId(createdTaskId);
                pollResults(createdTaskId);
            } else {
                appendLog(`CRITICAL ERROR: ${JSON.stringify(data)}`);
                setLoading(false);
            }
        } catch (e) {
            appendLog(`CRITICAL ERROR: Network failure submitting job.`);
            setLoading(false);
        }
    };

    const pollResults = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                // Need to provide aigc_video_type parameter to query TikTok's Avatar database!
                const res = await fetch(`https://web-production-1f2e2.up.railway.app/api/tiktok/status/video/${id}?aigc_video_type=AVATAR_PRODUCT`);
                if (res.status === 200) {
                    const data = await res.json();
                    const tasks = data.list || [];
                    
                    if (tasks.length > 0) {
                        const t = tasks[0];
                        appendLog(`Polling worker... Status: ${t.status || 'PROCESSING'}`);
                        
                        if (t.status === "SUCCESS") {
                            appendLog("Job rendering complete. HD Video Available.");
                            setFinalVideoUrl(t.preview_url || t.video_url || t.avatar_video_id);
                            setLoading(false);
                            clearInterval(interval);
                        } else if (t.status === "FAILED") {
                            appendLog(`CRITICAL ERROR: TikTok rejected job.`);
                            setLoading(false);
                            clearInterval(interval);
                        }
                    } else {
                        appendLog("Polling worker... awaiting TikTok queue placement...");
                    }
                }
            } catch (e) {
                // Keep polling
            }
        }, 5000);
    };

    return (
        <div className="h-screen bg-[#0a0a0a] text-gray-300 flex flex-col font-sans overflow-hidden">
            {/* Nav Header */}
            <div className="flex justify-between items-center bg-[#111] border-b border-gray-800 px-6 py-3 shrink-0">
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
                <div className="flex gap-2">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm border border-gray-800 bg-gray-900/50 px-3 py-1.5 rounded-md transition-colors font-mono">
                        [ BACK_TO_ADS ]
                    </Link>
                </div>
            </div>

            {/* 3-Column Workspace */}
            <div className="flex-1 flex overflow-hidden">

                {/* COLUMN 1: Config Sidebar */}
                <div className={`bg-[#111] border-r border-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden border-r-0'}`}>
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="bg-black border-teal-900/30 shadow-sm">
                            <CardHeader className="bg-teal-950/20 text-teal-500 rounded-t-lg pb-4 border-b border-teal-900/30">
                                <CardTitle className="text-lg font-mono uppercase tracking-wider">Avatar Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-400 font-mono text-xs uppercase">Script Iteration</Label>
                                    <Textarea
                                        value={script}
                                        onChange={e => setScript(e.target.value)}
                                        rows={4}
                                        className="bg-[#0a0a0a] border-teal-900/50 text-white focus:ring-teal-500 font-mono text-xs"
                                    />
                                    <p className="text-xs text-gray-600 font-mono">The Avatar will naturally lip-sync this exact text.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Button onClick={handleGenerate} disabled={loading || !selectedAvatarId} className="w-full h-12 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest border-0 shadow-lg shadow-teal-500/20 disabled:opacity-50">
                            {loading ? "[ RENDERING... ]" : "[ GENERATE_VIDEO ]"}
                        </Button>
                    </div>
                </div>

                {/* COLUMN 2: Workspace Center */}
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 scrollbar-thin scrollbar-thumb-gray-800">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {loading && (
                            <div className="flex flex-col items-center justify-center p-24 text-center space-y-4">
                                <Video className="w-12 h-12 text-teal-500 animate-pulse" />
                                <p className="text-sm text-teal-400 font-mono uppercase tracking-widest text-shadow">TikTok Server Farm Active</p>
                                <p className="text-gray-500 font-mono tracking-widest text-xs uppercase">&gt; Lip-sync rendering in progress...</p>
                            </div>
                        )}

                        {!loading && finalVideoUrl && (
                            <div className="flex flex-col items-center justify-center p-8 bg-black border border-teal-900/40 rounded-xl space-y-6">
                                <video 
                                    src={finalVideoUrl} 
                                    controls 
                                    autoPlay 
                                    className="max-h-[600px] rounded-lg shadow-2xl shadow-teal-900/20 border border-gray-800"
                                />
                                <div className="text-center font-mono text-xs p-3 bg-[#111] rounded-lg border border-gray-800 w-full break-all text-gray-400">
                                    {finalVideoUrl}
                                </div>
                            </div>
                        )}

                        {!loading && !finalVideoUrl && (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-gray-200 font-mono uppercase tracking-widest text-sm">Select Digital Actor</h2>
                                    <span className="text-xs text-teal-500 font-mono">{avatars.length} Models Online</span>
                                </div>
                                
                                {avatars.length === 0 ? (
                                    <div className="text-center py-20 text-gray-600 font-mono text-sm animate-pulse">
                                        &gt; Loading global avatar database...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {avatars.map(avatar => (
                                            <div 
                                                key={avatar.avatar_id}
                                                onClick={() => setSelectedAvatarId(avatar.avatar_id)}
                                                className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${selectedAvatarId === avatar.avatar_id ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'border-transparent hover:border-gray-600'}`}
                                            >
                                                <img 
                                                    src={avatar.avatar_thumbnail} 
                                                    alt={avatar.avatar_name}
                                                    className="w-full h-auto object-cover aspect-[9/16]"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <p className="text-white font-mono text-xs font-bold truncate">{avatar.avatar_name}</p>
                                                    
                                                    <div className="flex gap-1 mt-1 overflow-x-hidden">
                                                      {avatar.tag_groups?.map((group: any, idx: number) => (
                                                          <span key={idx} className="bg-black/80 text-gray-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase whitespace-nowrap border border-gray-800">
                                                              {group.tags?.[0]}
                                                          </span>
                                                      ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Play Button Overlay on Hover */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-10 h-10 text-white/80 ml-1" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* COLUMN 3: Terminal Console (Right) */}
                <div className="w-full md:w-[300px] xl:w-[350px] bg-[#0A0A0A] border-l border-gray-800 flex flex-col shrink-0">
                    <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0 text-gray-400">
                        <Terminal size={16} className="text-teal-500" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">Symphony Terminal</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1">
                        {terminalLogs.map((log, i) => (
                            <div key={i} className={`${log.includes("ERROR") ? 'text-red-400' : 'text-teal-400'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
