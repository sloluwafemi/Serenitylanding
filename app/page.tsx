"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, MessageCircle, User } from "lucide-react";

/**
 * Serenity Med Spa — Conversational Lead Capture Landing Page
 * Saves submissions to Google Sheets via Next.js API → Apps Script.
 */

const CONFIG = {
  brand: {
    name: "Serenity Med Spa",
    tagline: "Doctor-Led Med Spa, Ikoyi, Lagos",
    accent: "#D4AF37",
  },
  offer: {
    headline: "Refresh Your Glow: Get 10% Off Your First Treatment!",
    sub: "Answer 3 quick questions to claim your discount and personalize your spa experience.",
    cta: "Reveal My Offer",
    thankYouTitle: "Check your email!",
    thankYouBody: "Discount details have been sent.",
  },
  redirectUrl: "https://www.serenityspang.com/",
  redirectDelaySeconds: 5,
  questions: [
    {
      id: "concern",
      label: "What’s your primary skincare or beauty concern?",
      placeholder: "Select a concern",
      type: "select" as const,
      options: ["Acne", "Dark Spots", "Aging", "Laser Hair Removal", "Hydration / Dryness", "Other"],
      required: true,
    },
    {
      id: "service",
      label: "Which service interests you most?",
      placeholder: "Select a service",
      type: "select" as const,
      options: ["AI Skin Analysis", "Facials", "Laser Hair Removal", "Chemical Peel", "Infusions", "Microneedling"],
      required: true,
    },
    {
      id: "timeline",
      label: "How soon are you looking to book?",
      placeholder: "Choose a timeframe",
      type: "select" as const,
      options: ["Within 1 week", "1–2 weeks", "Later"],
      required: true,
    },
    {
      id: "heardFrom",
      label: "How did you hear about us? (optional)",
      placeholder: "Select a channel",
      type: "select" as const,
      options: ["Instagram", "Referral", "Google Search", "Other"],
      required: false,
    },
  ],
};

interface Answers {
  concern?: string;
  service?: string;
  timeline?: string;
  heardFrom?: string;
}

// Chat bubble
function Bubble({ role, children }: { role: "bot" | "you"; children: React.ReactNode }) {
  const isBot = role === "bot";
  return (
    <div className={`w-full flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border
        ${isBot ? "bg-white text-foreground" : "bg-muted text-foreground"}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function SerenityConversationalLanding() {
  const [step, setStep] = useState<number>(0); // 0=hero, 1..Q=questions, Q+1=lead form, then success
  const [answers, setAnswers] = useState<Answers>({});
  const [lead, setLead] = useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(CONFIG.redirectDelaySeconds);

  const totalSteps = CONFIG.questions.length + 1; // + lead form
  const progress = useMemo(
    () => Math.round((Math.min(step, totalSteps) / totalSteps) * 100),
    [step, totalSteps]
  );
  const currentQuestion = CONFIG.questions[step - 1];

  function next() { setStep((s) => Math.min(s + 1, totalSteps)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }
  function setAnswer<K extends keyof Answers>(id: K, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }
  function handleLeadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setLead((prev) => ({ ...prev, [name]: value }));
  }
  function leadValid() {
    const emailOk = /.+@.+\..+/.test(lead.email);
    const phoneOk = lead.phone.trim().length >= 7;
    const nameOk = lead.name.trim().length >= 2;
    return emailOk && phoneOk && nameOk;
  }
  function canAdvanceFromQuestion() {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const v = (answers as any)[currentQuestion.id];
    return typeof v === "string" && v.length > 0;
  }

  // Submit → call API → show success
  async function onSubmit() {
    if (!leadValid()) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        console.error("Lead save failed:", data?.error);
        alert("Sorry, we couldn't save your details. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // Success screen auto-redirect
  useEffect(() => {
    if (!submitted) return;
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const timer = setTimeout(() => {
      window.location.href = CONFIG.redirectUrl;
    }, CONFIG.redirectDelaySeconds * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [submitted]);

  // ---------- SUCCESS VIEW ----------
  if (submitted) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: CONFIG.brand.accent }} />
              <span className="font-semibold tracking-tight">{CONFIG.brand.name}</span>
            </div>
            <Badge variant="outline">{CONFIG.brand.tagline}</Badge>
          </div>
        </header>

        <section className="flex-1 grid place-items-center px-4 py-24">
          <Card className="max-w-xl w-full text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6" /> {CONFIG.offer.thankYouTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg">{CONFIG.offer.thankYouBody}</p>
              <p className="text-sm text-muted-foreground">Redirecting to website in {countdown}s…</p>
              <div className="pt-1">
                <Button onClick={() => (window.location.href = CONFIG.redirectUrl)}>Go now</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground flex items-center justify-between">
            <span>© {new Date().getFullYear()} {CONFIG.brand.name}</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  // ---------- MAIN VIEW ----------
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-20">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: CONFIG.brand.accent }} />
            <span className="font-semibold tracking-tight">{CONFIG.brand.name}</span>
          </div>
          <div className="w-40">
            <Progress value={progress} />
          </div>
        </div>
      </header>

      {/* Hero */}
      {step === 0 && (
        <section className="relative overflow-hidden">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{CONFIG.offer.headline}</h1>
              <p className="text-muted-foreground">{CONFIG.offer.sub}</p>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary">Ikoyi • Lagos, Nigeria</Badge>
                <Badge variant="outline">Doctor-Led</Badge>
                <Badge variant="outline">Premium Treatments</Badge>
              </div>
              <Button size="lg" className="mt-2" onClick={() => next()}>
                Start • {CONFIG.offer.cta}
              </Button>
            </div>
            <div className="hidden md:block">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2 items-start">
                    <MessageCircle className="h-4 w-4 mt-0.5" />
                    <span>Answer 3 quick questions in a friendly chat-style flow.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <User className="h-4 w-4 mt-0.5" />
                    <span>Share your details so our concierge can reach you.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="h-4 w-4 mt-0.5" />
                    <span>Receive your 10% Off and get help booking a slot.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Conversational Questions */}
      {step > 0 && step <= CONFIG.questions.length && (
        <section>
          <div className="mx-auto w-full max-w-2xl px-4 py-10">
            <div className="space-y-4">
              <Bubble role="bot">
                <div className="font-medium">Hi! I’m Serenity’s concierge 🤍</div>
                <div className="text-muted-foreground mt-1">
                  Let’s personalize your offer. {currentQuestion.required ? "(Required)" : "(Optional)"}
                </div>
              </Bubble>
              <Bubble role="bot">
                <div className="font-semibold">{currentQuestion.label}</div>
              </Bubble>

              <div className="pl-10">
                {currentQuestion.type === "select" && (
                  <Select
                    onValueChange={(v) => setAnswer(currentQuestion.id as keyof Answers, v)}
                    value={(answers as any)[currentQuestion.id] || undefined}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={currentQuestion.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentQuestion.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <Button variant="ghost" onClick={back} disabled={step === 0}>
                  Back
                </Button>
                <Button onClick={next} disabled={!canAdvanceFromQuestion()}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lead Details Form */}
      {step === CONFIG.questions.length + 1 && (
        <section>
          <div className="mx-auto w-full max-w-2xl px-4 py-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Almost there — where should we send your offer?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" placeholder="Your full name" value={lead.name} onChange={handleLeadChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="you@example.com" value={lead.email} onChange={handleLeadChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="080x xxx xxxx" value={lead.phone} onChange={handleLeadChange} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={back}>Back</Button>
                  <Button onClick={onSubmit} disabled={!leadValid() || submitting}>
                    {submitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CONFIG.brand.accent }} />
            <span>{CONFIG.brand.tagline}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
