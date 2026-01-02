"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Element } from "react-scroll";
import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
export function SayHi() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message"),
      }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      e.currentTarget.reset();
    }
  }

  return (
    <Element name="say-hi">
      <section className="w-screen md:h-[66dvh] h-[70vh] flex md:flex-row flex-col  items-center justify-center gap-7 md:scroll-mt-24 mb-25 ">
        <div className="flex-1 flex flex-col items-center justify-center md:mb-0 mb-5 gap-10">
          <motion.h2
            initial={{ opacity: 0, letterSpacing: "0.15em" }}
            whileInView={{ opacity: 1, letterSpacing: "0em" }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="md:text-6xl text-4xl font-bold text-center md:text-left text-primary"
          >
            Say Hi!
          </motion.h2>
          <p className="text-sm text-primary">
            <Typewriter
              words={[
                "Let’s start with a simple hello.",
                "I’m just a cup of coffee away",
              ]}
              loop
              cursor
              cursorStyle="|"
              typeSpeed={80}
              deleteSpeed={80}
              delaySpeed={1000}
            />
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 md:px-0 px-5">
            <Input name="name" placeholder="Your name" required />

            <Input
              name="email"
              type="email"
              placeholder="Your email"
              className="text-white bg-background/10"
              required
            />

            <Textarea
              name="message"
              placeholder="What’s on your mind?"
              rows={4}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send message"}
            </Button>

            {success && (
              <p className="text-sm text-green-600 text-center">
                Message sent. I’ll get back to you soon.
              </p>
            )}
          </form>
        </div>
      </section>
    </Element>
  );
}
