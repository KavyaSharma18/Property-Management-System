import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// POST: Upload user avatar/profile picture
// Body:
//   - imageUrl: URL of the uploaded image
// Note: This endpoint expects the image to already be uploaded to cloud storage
//       (e.g., Cloudinary, AWS S3, etc.) and just updates the URL in the database
// Returns: Updated user with new image URL
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();

    const { imageUrl } = body;

    // Validate image URL
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "Valid image URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid image URL format" },
        { status: 400 }
      );
    }

    // Update user image
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        image: imageUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Avatar update error:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}

// DELETE: Remove user avatar
// Returns: Success message
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    // Remove avatar
    await prisma.users.update({
      where: { id: userId },
      data: {
        image: null,
      },
    });

    return NextResponse.json({
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Avatar removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
