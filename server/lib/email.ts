import nodemailer from "nodemailer";
import { config } from "../config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendValidationEmail(
  email: string,
  name: string,
  code: string,
) {
  const mailOptions = {
    from: '"Your App" <no-reply@yourapp.com>',
    to: email,
    subject: "Verify Your Email",
    html: `
      <h1>Hello ${name},</h1>
      <p>Thank you for registering. Please use the following code to verify your email:</p>
      <h2 style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px;">${code}</h2>
      <p>This code will expire in ${config.validationCode.expiresInMinutes} minutes.</p>
    `,
  };

  transporter.sendMail(mailOptions);
}
