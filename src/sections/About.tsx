"use client";

import React from "react";
import { motion } from "framer-motion";
import TypeText from "@/components/TypeText";
import { Element } from "react-scroll";

const About = () => {
  return (
    <Element name="about">
      <section
        id="about"
        className="relative w-screen md:h-[86dvh] h-[75vh] flex justify-center items-center border-b border-primary/20"
      >
        <div className="relative md:w-[70%] w-[85%] md:text-lg text-sm text-secondary space-y-5 leading-relaxed md:ml-0 ml-5">
          {/* OPENING QUOTE */}
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 0.7, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="absolute md:-top-24 md:-left-20 md:text-[10rem] -top-12 -left-10 text-[6rem] font-black text-primary select-none pointer-events-none"
          >
            &ldquo;
          </motion.span>

          <p>
            <TypeText text="Yep, that’s me." />
          </p>

          <p>
            Crazy curious, annoyingly detail-oriented, and obsessed with
            building things that actually work.
          </p>

          <p>
            I’m <TypeText text="Rajesh Ande" />, a full-stack developer who
            enjoys turning messy ideas into clean, scalable products.
          </p>

          <p>
            I live mostly in the <TypeText text="JavaScript ecosystem" /> —
            React, Next.js, TypeScript — but I’m just as comfortable getting my
            hands dirty on the backend.
          </p>

          <p>
            I’ve worked on <TypeText text="production systems" /> — KYC flows,
            authentication, tokenized assets, performance fixes.
          </p>

          <p>
            I care about{" "}
            <TypeText text="UX, code quality, and shipping on time" />, in that
            order (most days).
          </p>

          <p>
            I don’t claim to know everything. But give me a problem, some docs,
            and a deadline —{" "}
            <TypeText text="I’ll figure it out and make it solid." />
          </p>

          <p className="cursor-pointer">
            If you’re here to work together — <TypeText text="say hi." />
          </p>

          {/* CLOSING QUOTE */}
          <motion.span
            initial={{ opacity: 0, y: -40 }}
            whileInView={{ opacity: 0.7, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="absolute md:-bottom-30 md:right-0 -bottom-20 right-0 md:text-[10rem] text-[6rem] font-black text-primary select-none pointer-events-none"
          >
            &rdquo;
          </motion.span>
        </div>
      </section>
    </Element>
  );
};

export default About;
