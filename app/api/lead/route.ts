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

    // --- Send confirmation email (non-blocking) ---
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
    } catch (emailErr) {
      // Don't fail the request if email has an issue
      // console.warn("Email send failed (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
