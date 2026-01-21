import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find valid token
    const verificationToken = await prisma.verification_tokens.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token and associated data
      await prisma.verification_tokens.deleteMany({
        where: {
          OR: [
            { token },
            { identifier: `PENDING_DATA:${token}` },
          ],
        },
      });
      return NextResponse.json(
        { error: "Verification token has expired. Please register again." },
        { status: 400 }
      );
    }

    // Check if this is a pending registration
    if (verificationToken.identifier.startsWith("PENDING_REG:")) {
      const email = verificationToken.identifier.replace("PENDING_REG:", "");

      // Get the stored registration data
      const dataToken = await prisma.verification_tokens.findFirst({
        where: { identifier: `PENDING_DATA:${token}` },
      });

      if (!dataToken) {
        return NextResponse.json(
          { error: "Registration data not found. Please register again." },
          { status: 400 }
        );
      }

      // Parse stored user data
      const userData = JSON.parse(dataToken.token);

      // Check if user already exists (someone might have registered with same email)
      const existingUser = await prisma.users.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        // Clean up tokens
        await prisma.verification_tokens.deleteMany({
          where: {
            OR: [
              { token },
              { identifier: `PENDING_DATA:${token}` },
              { identifier: `PENDING_REG:${email}` },
            ],
          },
        });
        return NextResponse.json(
          { error: "Email already registered. Please sign in." },
          { status: 400 }
        );
      }

      // Create the user NOW (after verification)
      const newUser = await prisma.users.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          emailVerified: new Date(),
          // role is intentionally not set - user will select it
        },
      });

      // Delete verification tokens
      await prisma.verification_tokens.deleteMany({
        where: {
          OR: [
            { token },
            { identifier: `PENDING_DATA:${token}` },
            { identifier: `PENDING_REG:${email}` },
          ],
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Email verified successfully! Your account has been created. You can now sign in.",
          user: {
            email: newUser.email,
            emailVerified: newUser.emailVerified,
          },
        },
        { status: 200 }
      );
    }

    // Handle existing user email verification (for OAuth or other cases)
    const user = await prisma.users.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete used token
    await prisma.verification_tokens.delete({
      where: { token },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully! You can now sign in.",
        user: {
          email: user.email,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
