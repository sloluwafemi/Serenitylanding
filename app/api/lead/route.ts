import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // { lead, answers }
    const { lead, answers } = body || {};

    if (!lead?.name || !lead?.email || !lead?.phone) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const userAgent = (req.headers as any).get?.("user-agent") || "";
    const forwardedFor = (req.headers as any).get?.("x-forwarded-for") || "";

    const webhook = process.env.APPS_SCRIPT_WEBAPP_URL;
    if (!webhook) {
      return NextResponse.json({ ok: false, error: "Missing APPS_SCRIPT_WEBAPP_URL" }, { status: 500 });
    }

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead,
        answers,
        meta: {
          userAgent,
          ip: forwardedFor,
          page: process.env.SITE_URL || "",
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return NextResponse.json({ ok: false, error: data?.error || "Sheet write failed" }, { status: 502 });
    }

    // --- Send emails (non-blocking) ---
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || "true") === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
      const to = (lead.email || "").trim();

      // 1) Confirmation email to the lead
      if (to) {
        await transporter.sendMail({
          from,
          to,
          subject: "Your Serenity Med Spa 10% Offer",
          text: `Hi ${lead.name || "there"},

Thanks for your interest in Serenity Med Spa. Your 10% discount is locked in.

Use the discount code: SERENE2025

— Serenity Med Spa, Ikoyi
https://www.serenityspang.com/`,
          html: `<p>Hi ${lead.name || "there"},</p>
<p>Thanks for your interest in <strong>Serenity Med Spa</strong>. Your <strong>10% discount</strong> is locked in.</p>
<p>Use the discount code: <b>SERENE2025</b>.</p>
<p>— Serenity Med Spa, Ikoyi<br/>
<a href="https://www.serenityspang.com/">serenityspang.com</a></p>`,
        });
      }

      // 2) Notification email to your team
      const notifyList =
        (process.env.NOTIFY_TO || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      if (notifyList.length) {
        const submittedAt = new Date().toLocaleString();
        await transporter.sendMail({
          from,
          to: notifyList,               // supports multiple recipients
          replyTo: to || undefined,     // reply goes to the lead
          subject: "🔥 New Serenity Med Spa Lead",
          text: `New lead submitted:

Name:    ${lead.name}
Email:   ${lead.email}
Phone:   ${lead.phone}
Concern: ${answers?.concern || "-"}
Service: ${answers?.service || "-"}
Timeline:${answers?.timeline || "-"}
Heard:   ${answers?.heardFrom || "-"}

Submitted: ${submittedAt}
Page:      ${process.env.SITE_URL || ""}
`,
          html: `<h3>New lead submitted</h3>
<p><b>Name:</b> ${lead.name}<br/>
<b>Email:</b> ${lead.email}<br/>
<b>Phone:</b> ${lead.phone}<br/>
<b>Concern:</b> ${answers?.concern || "-"}<br/>
<b>Service:</b> ${answers?.service || "-"}<br/>
<b>Timeline:</b> ${answers?.timeline || "-"}<br/>
<b>Heard:</b> ${answers?.heardFrom || "-"}</p>
<p><b>Submitted:</b> ${submittedAt}<br/>
<b>Page:</b> ${process.env.SITE_URL || ""}</p>
<p>Reply to this email to contact the lead directly.</p>`,
        });
      }
    } catch (emailErr) {
      // Do not fail the request if email sending has an issue
      // console.warn("Email send failed (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
