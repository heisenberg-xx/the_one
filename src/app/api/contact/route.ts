import { NextResponse } from "next/server";
import { Resend } from "resend";
import pug from "pug";
import path from "path";

const resend = new Resend("re_WRpj8kiq_KnYG2JVWCgg2WJiABW8EP5pA");

export async function POST(req: Request) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const templatePath = path.join(
    process.cwd(),
    "public",
    "emails",
    "contact.pug"
  );

  const html = pug.renderFile(templatePath, {
    name,
    email,
    message,
  });

  await resend.emails.send({
    from: "Portfolio <onboarding@resend.dev>",
    to: ["anderajesh15@gmail.com"],
    subject: `New message from ${name}`,
    replyTo: email,
    html,
  });

  return NextResponse.json({ success: true });
}
