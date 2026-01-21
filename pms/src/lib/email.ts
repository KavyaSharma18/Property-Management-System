import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "465"),
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Property Management System"}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify your email address",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .content {
                padding: 30px;
              }
              .button {
                display: inline-block;
                padding: 14px 28px;
                background-color: #667eea;
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: bold;
              }
              .button:hover {
                background-color: #5568d3;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
              }
              .link-text {
                word-break: break-all;
                color: #667eea;
                font-size: 14px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Welcome! 🎉</h1>
              </div>
              <div class="content">
                <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
                <p>Thank you for registering with Property Management System!</p>
                <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <div class="link-text">${verificationUrl}</div>
                <p><strong>⏰ This link will expire in 24 hours.</strong></p>
              </div>
              <div class="footer">
                <p>If you didn't create an account, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} Property Management System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to Property Management System!

Please verify your email address by visiting this link:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Property Management System"}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Reset your password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .content {
                padding: 30px;
              }
              .button {
                display: inline-block;
                padding: 14px 28px;
                background-color: #f5576c;
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: bold;
              }
              .button:hover {
                background-color: #d9455a;
              }
              .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
              }
              .link-text {
                word-break: break-all;
                color: #f5576c;
                font-size: 14px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
              </div>
              <div class="content">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                <p>You requested to reset your password for your Property Management System account.</p>
                <p>Click the button below to choose a new password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <div class="link-text">${resetUrl}</div>
                <p><strong>⏰ This link will expire in 1 hour.</strong></p>
              </div>
              <div class="footer">
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                <p>&copy; ${new Date().getFullYear()} Property Management System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Password Reset Request

You requested to reset your password for your Property Management System account.

Visit this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error };
  }
}
