import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const accessCode = request.headers.get("x-access-code");
    if (accessCode !== (process.env.FRONTEND_ACCESS_CODE || "nmg_super_secret_2026")) {
        return NextResponse.json({ error: "Unauthorized. Invalid Access Code." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    try {
        const response = await fetch(`https://web-production-1f2e2.up.railway.app/api/jobs/history?limit=${limit}&offset=${offset}`, {
            method: "GET",
            headers: {
                "X-API-KEY": process.env.NMG_AD_GEN || "ThiCcp69wPNwi@E-hxaEBbFCq"
            }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch ad history" }, { status: 500 });
    }
}
