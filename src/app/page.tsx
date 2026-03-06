"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Menu, ChevronLeft, Terminal } from "lucide-react";
import { META_PLACEMENTS } from "@/data/placements.config";
import { AdGroupView } from "@/components/ad-previews/AdGroupView";

export default function Home() {
    const [jobId, setJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    // Layout
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] CreativeBox Initialized..."]);

    const appendLog = (msg: string) => {
        setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Security
    const [accessCode, setAccessCode] = useState("");

    // Core Context State
    const [campaignGoal, setCampaignGoal] = useState("");
    const [campaignVertical, setCampaignVertical] = useState("");
    const [productSummary, setProductSummary] = useState("");
    const [targetAudience, setTargetAudience] = useState("");

    // Arrays
    const [constraints, setConstraints] = useState("");
    const [compliance, setCompliance] = useState("");
    const [imageUrls, setImageUrls] = useState("");

    // Seeds & Copies
    const [seedHeadline, setSeedHeadline] = useState("");
    const [seedBody, setSeedBody] = useState("");
    const [useSeedsAsInspiration, setUseSeedsAsInspiration] = useState(true);
    const [imageText, setImageText] = useState("");

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "x-access-code": accessCode },
                body: formData,
            });
            const data = await res.json();
            if (res.ok && data.url) {
                // Append the URL to the existing comma/newline separated list
                setImageUrls(prev => prev.trim() ? prev + "\n" + data.url : data.url);
            } else {
                alert("Upload failed: " + JSON.stringify(data));
            }
        } catch (error) {
            alert("Error uploading image");
        } finally {
            setUploadingImage(false);
            e.target.value = ""; // Clear input so they can upload the same file again if they want
        }
    };

    // Placements
    const [selectedPlacements, setSelectedPlacements] = useState<string[]>(["meta_feed_1_1"]);

    const handleGenerate = async () => {
        setLoading(true);
        setJobId(null);
        setResults([]);
        setTerminalLogs(["[SYSTEM] Generation Job Started..."]);
        setIsConfigOpen(false); // Auto-collapse config when generating

        appendLog("Compiling target placement variants...");
        const target_placements = selectedPlacements.map(id => {
            const spec = META_PLACEMENTS.find(p => p.id === id);
            return spec ? {
                id: spec.id,
                platform: spec.platform,
                placement: spec.placement,
                aspect_ratio: spec.aspect_ratio,
                format_type: spec.format_type
            } : null;
        }).filter(Boolean);

        const payload = {
            project_context: {
                campaign_goal: campaignGoal,
                campaign_vertical: campaignVertical || undefined,
                product_service_summary: productSummary,
                target_audience: targetAudience,
                user_constraints: constraints.split("\n").filter(c => c.trim() !== ""),
                compliance_guidelines: compliance.split("\n").filter(c => c.trim() !== ""),
                reference_image_urls: imageUrls.split("\n").filter(c => c.trim() !== ""),
                seed_headline: seedHeadline || undefined,
                seed_body_copy: seedBody || undefined,
            },
            config: {
                target_placements: target_placements,
                use_seeds_as_inspiration: useSeedsAsInspiration,
                desired_output_type: "static_image_with_text",
                style_template: "professional_modern",
                image_copy: imageText ? { text: imageText, style_prompt: "bold sans-serif font" } : undefined
            }
        };

        try {
            appendLog("Injecting compliance constraints...");
            appendLog("Calling local Generation Router...");

            // We will send this to our local Next.js API Route to securely attach the API Key!
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-access-code": accessCode
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.job_id) {
                appendLog(`Worker Job Dispatched. ID: ${data.job_id}`);
                setJobId(data.job_id);
                pollResults(data.job_id);
            } else {
                appendLog(`CRITICAL ERROR: ${JSON.stringify(data)}`);
                alert("Failed to start job: " + JSON.stringify(data));
                setLoading(false);
            }
        } catch (e) {
            appendLog(`CRITICAL ERROR: Network failure submitting job.`);
            alert("Error submitting job.");
            setLoading(false);
        }
    };

    const handleRegenerateSingle = async (placementId: string) => {
        if (!placementId) return;
        setLoading(true);
        setJobId(null);
        setResults([]);

        const spec = META_PLACEMENTS.find(p => p.id === placementId);
        const target_placements = spec ? [{
            id: spec.id,
            platform: spec.platform,
            placement: spec.placement,
            aspect_ratio: spec.aspect_ratio,
            format_type: spec.format_type
        }] : [];

        const payload = {
            project_context: {
                campaign_goal: campaignGoal,
                campaign_vertical: campaignVertical || undefined,
                product_service_summary: productSummary,
                target_audience: targetAudience,
                user_constraints: constraints.split("\n").filter(c => c.trim() !== ""),
                compliance_guidelines: compliance.split("\n").filter(c => c.trim() !== ""),
                reference_image_urls: imageUrls.split("\n").filter(c => c.trim() !== ""),
                seed_headline: seedHeadline || undefined,
                seed_body_copy: seedBody || undefined,
            },
            config: {
                target_placements: target_placements,
                use_seeds_as_inspiration: useSeedsAsInspiration,
                desired_output_type: "static_image_with_text",
                style_template: "professional_modern",
                image_copy: imageText ? { text: imageText, style_prompt: "bold sans-serif font" } : undefined
            }
        };

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-access-code": accessCode
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.job_id) {
                setJobId(data.job_id);
                pollResults(data.job_id);
            } else {
                alert("Failed to start single job: " + JSON.stringify(data));
                setLoading(false);
            }
        } catch (e) {
            alert("Error submitting single job.");
            setLoading(false);
        }
    };

    const pollResults = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/generate?job_id=${id}`, {
                    headers: { "x-access-code": accessCode }
                });
                if (res.status === 200) {
                    const data = await res.json();
                    appendLog("Job rendering complete. Downloading assets...");
                    setResults(data.ads_generated);
                    setLoading(false);
                    clearInterval(interval);
                } else if (res.status !== 404) {
                    const err = await res.json();
                    appendLog(`CRITICAL ERROR: Job failed to render: ${JSON.stringify(err)}`);
                    alert("Job Failed: " + JSON.stringify(err));
                    setLoading(false);
                    clearInterval(interval);
                } else {
                    appendLog("Polling worker... generating creative assets...");
                }
            } catch (e) {
                // Keep polling
            }
        }, 5000);
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
            {/* Nav Header */}
            <div className="flex justify-between items-center bg-white border-b border-gray-200 px-6 py-3 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        {isConfigOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none">NMG Ad Gen</h1>
                        <p className="text-gray-500 text-xs mt-1">Omni-Channel Generative Ad Engine</p>
                    </div>
                </div>
                <div>
                    <a href="/history" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-md transition-colors">
                        Library & History &rarr;
                    </a>
                </div>
            </div>

            {/* 3-Column Workspace */}
            <div className="flex-1 flex overflow-hidden">

                {/* COLUMN 1: Config Sidebar */}
                <div
                    className={`bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ease-in-out shrink-0 ${isConfigOpen ? 'w-full md:w-[400px] xl:w-[450px] p-6' : 'w-0 p-0 overflow-hidden'}`}
                >
                    <div className="space-y-6 w-full min-w-[350px]">
                        <Card className="border-red-200 shadow-sm">
                            <CardHeader className="bg-red-50 text-red-900 rounded-t-lg pb-4 border-b border-red-100">
                                <CardTitle className="text-lg">Security Clearance</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-700">Team Access Code</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter the master access code to generate..."
                                        value={accessCode}
                                        onChange={e => setAccessCode(e.target.value)}
                                        className="border-red-200 focus:ring-red-500"
                                    />
                                    <p className="text-xs text-gray-500">Required. Unauthorized generations will be rejected.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>1. Campaign Context</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label>Campaign Goal</Label><Input value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} /></div>
                                <div className="space-y-2">
                                    <Label>Campaign Vertical</Label>
                                    <select
                                        value={campaignVertical}
                                        onChange={e => setCampaignVertical(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    >
                                        <option value="">General / Global Rules</option>
                                        <option value="auto_insurance">Auto Insurance</option>
                                        <option value="weight_loss">Weight Loss</option>
                                    </select>
                                </div>
                                <div className="space-y-2"><Label>Product Summary</Label><Input value={productSummary} onChange={e => setProductSummary(e.target.value)} /></div>
                                <div className="space-y-2"><Label>Target Audience</Label><Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} /></div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>2. Advanced Constraints</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>General Rules (One per line)</Label>
                                    <Textarea value={constraints} onChange={e => setConstraints(e.target.value)} rows={3} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Compliance Guidelines (Zero Tolerance)</Label>
                                    <Textarea value={compliance} onChange={e => setCompliance(e.target.value)} rows={3} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>3. Assets & Seeds</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Image-to-Image Seeds (URLs)</Label>
                                    <Textarea value={imageUrls} onChange={e => setImageUrls(e.target.value)} rows={3} placeholder="Paste public image URLs here..." />
                                </div>
                                <div className="space-y-2 p-4 bg-gray-100 rounded-lg border border-dashed border-gray-300">
                                    <Label className="block text-sm font-semibold mb-2 text-gray-700">Upload Local File (Auto-hosted)</Label>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                        className="bg-white"
                                    />
                                    {uploadingImage && <p className="text-sm font-semibold text-indigo-500 mt-2">Uploading to Cloud Storage...</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Exact Image Text Overlay</Label>
                                    <Input value={imageText} onChange={e => setImageText(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2"><Label>Seed Headline</Label><Input value={seedHeadline} placeholder="Leave blank to generate..." onChange={e => setSeedHeadline(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Seed Body</Label><Input value={seedBody} placeholder="Leave blank to generate..." onChange={e => setSeedBody(e.target.value)} /></div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch checked={useSeedsAsInspiration} onCheckedChange={setUseSeedsAsInspiration} />
                                    <Label>Use text seeds merely as inspiration (Rewrite)</Label>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>4. Target Placements</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {META_PLACEMENTS.map(placement => (
                                    <div key={placement.id} className="flex items-start space-x-3 p-2 hover:bg-gray-100 rounded-md transition-colors">
                                        <Checkbox
                                            id={placement.id}
                                            checked={selectedPlacements.includes(placement.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedPlacements([...selectedPlacements, placement.id]);
                                                } else {
                                                    setSelectedPlacements(selectedPlacements.filter(id => id !== placement.id));
                                                }
                                            }}
                                        />
                                        <div className="space-y-1 leading-none">
                                            <Label htmlFor={placement.id} className="font-bold cursor-pointer">
                                                {placement.platform} - {placement.placement} ({placement.aspect_ratio})
                                            </Label>
                                            <p className="text-xs text-gray-500">{placement.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-lg font-bold">
                            {loading ? "Generating Payload..." : "Generate Creatives"}
                        </Button>
                    </div>
                </div>

                {/* COLUMN 2: Generated Previews (Center) */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {loading && (
                            <div className="flex flex-col items-center justify-center p-24 text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-mono">Job {jobId} Queued...</p>
                                <p className="text-sm text-indigo-500 font-semibold">Generative AI is crafting your visuals.</p>
                            </div>
                        )}

                        {!loading && results.length === 0 && (
                            <div className="text-center text-gray-500 py-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                <p className="font-semibold text-lg text-gray-700 mb-2">Workspace Ready.</p>
                                <p>Configure your parameters on the left and click Generate.</p>
                            </div>
                        )}

                        {!loading && results.length > 0 && (
                            <AdGroupView
                                results={results}
                                onRegenerateSingle={handleRegenerateSingle}
                            />
                        )}
                    </div>
                </div>

                {/* COLUMN 3: Terminal Console (Right) */}
                <div className="w-full md:w-[300px] xl:w-[350px] bg-[#0A0A0A] border-l border-gray-800 flex flex-col shrink-0">
                    <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0 text-gray-400">
                        <Terminal size={16} className="text-green-500" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">System Console</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1">
                        {terminalLogs.map((log, i) => (
                            <div key={i} className={`${log.includes("ERROR") ? 'text-red-400' : 'text-green-400'}`}>
                                {log}
                            </div>
                        ))}
                        {loading && (
                            <div className="text-green-500/50 flex space-x-1 animate-pulse">
                                <span>_</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
