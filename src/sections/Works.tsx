"use client";
import Image from "next/image";
import React from "react";
import { Element } from "react-scroll";
import { AnimatePresence, motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import { url } from "inspector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const works = [
  {
    title: "Session",
    logo: "/icons/works/session.png",
    desc: (
      <>
        This project started as a way to go beyond{" "}
        <span className="font-medium text-primary">“it works”</span> and really
        understand{" "}
        <span className="font-medium text-primary">real-time video calls</span>.
        I ended up building a Google Meet–style app where{" "}
        <span className="font-medium text-primary">Mediasoup</span> handles
        video streams,{" "}
        <span className="font-medium text-primary">Socket.IO</span> manages
        signaling, and <span className="font-medium text-primary">React</span>{" "}
        with <span className="font-medium text-primary">Express</span> keeps
        everything in sync — messy at times, but very real.
      </>
    ),
    url: "https://session-dev.vercel.app/",
    span: 1,
  },
  {
    title: "Blood Bridge",
    logo: "/icons/works/bb.png",
    desc: (
      <>
        Built this to understand how tech can actually help in{" "}
        <span className="font-medium text-primary">
          critical, real-life situations
        </span>
        . The platform connects{" "}
        <span className="font-medium text-primary">blood donors</span> and{" "}
        <span className="font-medium text-primary">receivers</span> using{" "}
        <span className="font-medium text-primary">OTP-based verification</span>{" "}
        to keep the system clean and reliable. Developed with{" "}
        <span className="font-medium text-primary">React</span>,{" "}
        <span className="font-medium text-primary">Material UI</span>,{" "}
        <span className="font-medium text-primary">Express</span>, and{" "}
        <span className="font-medium text-primary">MongoDB</span>, focusing on
        speed, usability, and trust.
      </>
    ),
    url: "https://blood-bridge.vercel.app/",
    span: 1,
  },
  {
    title: "Ben-10 Wiki",
    logo: "/icons/works/ben10.png",
    desc: (
      <>
        A fan-made wiki born out of curiosity around{" "}
        <span className="font-medium text-primary">structured data</span> and{" "}
        <span className="font-medium text-primary">state management</span>. The
        app breaks down{" "}
        <span className="font-medium text-primary">Ben 10 aliens</span>,{" "}
        <span className="font-medium text-primary">seasons</span>, and details
        through an interactive UI powered by{" "}
        <span className="font-medium text-primary">React</span> and{" "}
        <span className="font-medium text-primary">Redux</span>, styled with{" "}
        <span className="font-medium text-primary">Tailwind CSS</span>, and
        supported by <span className="font-medium text-primary">Express</span>{" "}
        and <span className="font-medium text-primary">MongoDB</span>.
      </>
    ),
    url: "https://ben-10-wiki.vercel.app/",
    span: 1,
  },
  {
    title: "Moody",
    logo: "/icons/works/moody.png",
    desc: (
      <>
        A personal experiment around{" "}
        <span className="font-medium text-primary">mood tracking</span> and{" "}
        <span className="font-medium text-primary">
          state-driven interfaces
        </span>
        . Built as a simple digital diary where users can log thoughts and track{" "}
        <span className="font-medium text-primary">mood patterns</span> over
        time, using <span className="font-medium text-primary">Next.js</span>{" "}
        and <span className="font-medium text-primary">shadcn/ui</span> for the
        interface, <span className="font-medium text-primary">Clerk</span> for
        authentication, <span className="font-medium text-primary">ArcJet</span>{" "}
        for protection, and{" "}
        <span className="font-medium text-primary">MongoDB</span> for
        persistence.
      </>
    ),
    url: "https://moody-digital-diary.vercel.app/",
    span: 1,
  },
  {
    title: "Copy-Code",
    logo: "/icons/works/copycode.svg",
    desc: (
      <>
        This project came from wanting a simple way to{" "}
        <span className="font-medium text-primary">share code snippets</span>{" "}
        across devices without friction. It lets users jump in with a single{" "}
        <span className="font-medium text-primary">username</span> and access
        their snippets anywhere, without accounts or setup overhead. The
        interface is built with{" "}
        <span className="font-medium text-primary">React</span> and{" "}
        <span className="font-medium text-primary">Tailwind CSS</span>, while{" "}
        <span className="font-medium text-primary">React Context</span> keeps
        shared state predictable. On the backend,{" "}
        <span className="font-medium text-primary">Express</span> and{" "}
        <span className="font-medium text-primary">MongoDB</span> handle storage
        and retrieval, focusing on speed, simplicity, and reliability.
      </>
    ),
    url: "https://copy-code.vercel.app/",
    span: 2,
  },

  {
    title: "Rock Paper Scissors",
    logo: "/icons/works/rps.jpg",
    desc: (
      <>
        This was one of my early projects, built to get comfortable with{" "}
        <span className="font-medium text-primary">core web fundamentals</span>.
        It’s a simple Rock-Paper-Scissors game written in{" "}
        <span className="font-medium text-primary">HTML</span>,{" "}
        <span className="font-medium text-primary">CSS</span>, and{" "}
        <span className="font-medium text-primary">JavaScript</span>, with a
        computer opponent that makes each round unpredictable. The focus was on{" "}
        <span className="font-medium text-primary">clean logic</span>,{" "}
        <span className="font-medium text-primary">responsive layout</span>, and
        understanding how user interactions translate into behavior on the page.
      </>
    ),
    url: "https://rock-paper-scissors-bro.netlify.app/",
    span: 2,
  },
];

const spanMap: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};
export const Works = () => {
  const [hovered, setHovered] = React.useState<number | null>(null);
  return (
    <Element name="works">
      <section className="w-screen md:h-[86dvh] h-[80vh] flex md:flex-row flex-col-reverse  items-center justify-center gap-7 md:scroll-mt-24 mb-10 border-b border-primary/20">
        <div className="grid md:px-0 px-5 md:grid-cols-3 grid-cols-2 gap-10 items-center border border-primary/20 p-6 rounded-md bg-primary/5 my-10 md:my-2">
          {works.map((work, index) => (
            <div
              key={work.title.toLowerCase()}
              className={cn(
                spanMap[work.span],
                "flex flex-col items-center gap-2"
              )}
            >
              <motion.div
                onMouseEnter={() => setHovered(index)}
                onClick={() =>
                  setHovered((prev) => (prev === index ? null : index))
                }
                //
                className="md:w-40 md:h-20 w-20 h-15 relative"
                initial={{ scale: 1 }}
                whileHover={{
                  scale: 1.9,
                }}
                animate={{
                  scale: hovered === index ? 1.9 : 1,
                }}
                transition={{
                  type: "spring",
                  damping: 40,
                  stiffness: 700,
                }}
              >
                <Image
                  fill
                  className={cn(
                    work.title === "Rock Paper Scissors"
                      ? "bg-white rounded-md"
                      : "",
                    "object-contain "
                  )}
                  src={work.logo}
                  alt={work.title}
                />
              </motion.div>
            </div>
          ))}
        </div>
        <div className="md:w-150 md:px-0 px-5 h-100 flex justify-center items-center md:mt-0 mt-10 md:text-sm text-xs">
          {hovered !== null ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={hovered}
                onMouseLeave={() => setHovered(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-white flex items-start justify-center gap-5 flex-col max-w-xl"
              >
                <p>{works[hovered].desc}</p>

                <a
                  href={works[hovered].url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button>View</Button>
                </a>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <motion.p
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-primary text-sm md:block hidden"
              >
                <Typewriter
                  words={[
                    "Projects that kept me curious,",
                    "hover to explore them.",
                  ]}
                  loop
                  cursor
                  cursorStyle="|"
                  typeSpeed={80}
                  deleteSpeed={80}
                  delaySpeed={1000}
                />
              </motion.p>
              <motion.p
                key="placeholder-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-primary text-sm md:hidden block"
              >
                <Typewriter
                  words={[
                    "Projects that kept me curious,",
                    "click to explore them.",
                  ]}
                  loop
                  cursor
                  cursorStyle="|"
                  typeSpeed={80}
                  deleteSpeed={80}
                  delaySpeed={1000}
                />
              </motion.p>
            </>
          )}
        </div>
      </section>
    </Element>
  );
};
