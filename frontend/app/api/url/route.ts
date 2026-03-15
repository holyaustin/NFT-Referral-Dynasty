import { NextResponse } from "next/server";
import { pinata } from "@/lib/pinata";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = await pinata.upload.public.createSignedURL({
      expires: 30,
    });
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return NextResponse.json(
      { error: "Error creating upload URL" },
      { status: 500 }
    );
  }
}