import { NextResponse } from "next/server";

// This runs securely on the Node.js server, never in the browser!
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch("https://web-production-1f2e2.up.railway.app/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Inject the secret key here!
                "X-API-KEY": process.env.NMG_AD_GEN || "ThiCcp69wPNwi@E-hxaEBbFCq"
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        return NextResponse.json({ error: "Failed to securely proxy request" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
        return NextResponse.json({ error: "No job_id provided" }, { status: 400 });
    }

    try {
        const response = await fetch(`https://web-production-1f2e2.up.railway.app/api/jobs/${jobId}/results`, {
            method: "GET",
            headers: {
                // Inject the secret key for polling
                "X-API-KEY": process.env.NMG_AD_GEN || "ThiCcp69wPNwi@E-hxaEBbFCq"
            }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        return NextResponse.json({ error: "Failed to poll job status" }, { status: 500 });
    }
}
