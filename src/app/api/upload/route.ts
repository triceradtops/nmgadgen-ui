import { NextResponse } from "next/server";

// This runs securely on the Node.js server, never in the browser!
export async function POST(request: Request) {
    try {
        const accessCode = request.headers.get("x-access-code");
        if (accessCode !== (process.env.FRONTEND_ACCESS_CODE || "nmg_super_secret_2026")) {
            return NextResponse.json({ error: "Unauthorized. Invalid Access Code." }, { status: 401 });
        }

        const formData = await request.formData();

        const response = await fetch("https://web-production-1f2e2.up.railway.app/api/upload", {
            method: "POST",
            headers: {
                // Inject the secret key here! Note: we DO NOT set Content-Type.
                // Fetch automatically creates the correct multipart/form-data boundary when passing formData
                "X-API-KEY": process.env.NMG_AD_GEN || "ThiCcp69wPNwi@E-hxaEBbFCq"
            },
            body: formData,
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        return NextResponse.json({ error: "Failed to securely proxy upload request" }, { status: 500 });
    }
}
