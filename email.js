import nodemailer from "nodemailer";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,  
    pass: process.env.BREVO_SMTP_KEY,

  }
});

export async function sendCertificateEmail({
  to,
  userName,
  attachmentPath
}) {
  try {
    // Ensure certificate exists
    if (!fs.existsSync(attachmentPath)) {
      throw new Error(`Certificate file not found: ${attachmentPath}`);
    }

    const html = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Hello ${userName},</h2>
        <p>🎉 Congratulations!</p>
        <p>Your certificate has been successfully generated and is attached to this message.</p>
        <p>Keep up the amazing work!</p>
        <br>
        <p>Regards,<br><strong>Nobert Wafula</strong></p>
      </div>
    `;

    const mailOptions = {
      from: `"Certificate System" <${process.env.EMAIL_USER}>`,
      to,
      subject: "🎓 Your Certificate is Ready",
      html,
      attachments: [
        {
          filename: "certificate.pdf",
          path: attachmentPath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);

    return info;

  } catch (err) {
    console.error("Email sending error:", err);
    throw err;
  }
}
