import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Get the access code passed from the frontend for auth
    const accessCode = request.headers.get("x-access-code");

    if (accessCode !== (process.env.FRONTEND_ACCESS_CODE || "nmg_super_secret_2026")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        // Call the python backend
        const response = await fetch(`${BACKEND_URL}/api/results/${id}/prompts`, {
            method: "GET",
            headers: {
                "X-API-KEY": "ThiCcp69wPNwi@E-hxaEBbFCq" // Using our secure backend key
            }
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch prompts from backend" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("API proxy error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
