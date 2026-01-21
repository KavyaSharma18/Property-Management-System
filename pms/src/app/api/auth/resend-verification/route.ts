import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if this is a pending registration
    const pendingReg = await prisma.verification_tokens.findFirst({
      where: { identifier: `PENDING_REG:${email}` },
    });

    if (pendingReg) {
      // Check if expired
      if (pendingReg.expires < new Date()) {
        // Delete old pending registration
        await prisma.verification_tokens.deleteMany({
          where: {
            OR: [
              { identifier: `PENDING_REG:${email}` },
              { identifier: `PENDING_DATA:${pendingReg.token}` },
            ],
          },
        });
        return NextResponse.json(
          { error: "Previous registration expired. Please register again." },
          { status: 400 }
        );
      }

      // Get the stored data
      const oldDataToken = await prisma.verification_tokens.findFirst({
        where: { identifier: `PENDING_DATA:${pendingReg.token}` },
      });

      if (!oldDataToken) {
        return NextResponse.json(
          { error: "Registration data not found. Please register again." },
          { status: 400 }
        );
      }

      // Delete old tokens
      await prisma.verification_tokens.deleteMany({
        where: {
          OR: [
            { identifier: `PENDING_REG:${email}` },
            { identifier: `PENDING_DATA:${pendingReg.token}` },
          ],
        },
      });

      // Generate new token
      const newToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Store with new token
      await prisma.verification_tokens.create({
        data: {
          identifier: `PENDING_REG:${email}`,
          token: newToken,
          expires,
        },
      });

      await prisma.verification_tokens.create({
        data: {
          identifier: `PENDING_DATA:${newToken}`,
          token: oldDataToken.token, // Reuse the registration data
          expires,
        },
      });

      // Send verification email
      const result = await sendVerificationEmail(email, newToken);

      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to send verification email" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Verification email sent successfully" },
        { status: 200 }
      );
    }

    // Check if user exists (already verified or OAuth user)
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: "If the email exists, a verification link has been sent." },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Delete any existing tokens for this email
    await prisma.verification_tokens.deleteMany({
      where: { identifier: email },
    });

    // Generate new verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    await prisma.verification_tokens.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email
    const result = await sendVerificationEmail(email, token);

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Verification email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in resend verification:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
