"use client";

import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Element } from "react-scroll";

const experiences = [
  {
    title: "Graduation",
    year: "2025",
    role: "B.Tech — ECE",
    desc: "Completed my degree while actively building full-stack projects, participating in hackathons, and strengthening my foundations in modern web development.",
    image: "",
  },
  {
    title: "Ryzer",
    year: "Jul – Nov 2025",
    role: "Full Stack Intern",
    desc: "Worked on real production features including authentication flows, KYC integrations, APIs, and UI improvements. Gained hands-on experience shipping and maintaining live systems.",
    image: "/ryzer.svg",
  },
  {
    title: "Ryzer",
    year: "Dec 2025 – Present",
    role: "Full Stack Developer",
    desc: "Continuing to build and scale production systems, focusing on performance, reliability, and clean architecture while owning features end-to-end.",
    image: "/ryzerx.svg",
  },
];

export default function Experience() {
  return (
    <Element name="experience">
      <section
        id="experience"
        className="w-screen md:h-[86dvh] h-[70vh] flex justify-center items-center border-b border-primary/20 scroll-mt-24"
      >
        <div className="hidden md:block w-[70%]">
          <div className="relative ">
            <motion.div
              className="absolute top-1/3 left-7  h-1 bg-primary origin-left rounded-md"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ width: "95%" }}
            />

            <div className="relative flex justify-between">
              {experiences.map((exp, i) => (
                <div key={i} className="relative flex flex-col items-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9, rotateZ: 0 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1, rotateZ: 2 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.6 + i * 0.2,
                      type: "spring",
                      stiffness: 120,
                      damping: 12,
                    }}
                    className="absolute -top-20 w-40 text-center text-xs bg-primary/10 backdrop-blur border border-primary/20 rounded-lg px-4 py-3 shadow-md "
                  >
                    <p className="text-primary font-semibold">{exp.role}</p>
                    <p className="text-primary font-semibold">{exp.year}</p>
                    {/* <p className="text-secondary mt-1">{exp.desc}</p> */}
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: i * 0.3,
                      type: "spring",
                      stiffness: 120,
                      damping: 20,
                    }}
                    className="z-10 flex flex-col items-center cursor-pointer"
                  >

                    <div
                      className={cn(
                        "relative h-15 w-15 rounded-full bg-background border border-primary/20 flex items-center justify-center"
                      )}
                    >
                      {exp.image ? (
                        <div className="relative h-10 w-10">
                          <Image
                            src={exp.image}
                            alt={exp.title}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-primary" />
                      )}
                    </div>

                    <span className="mt-4 text-sm text-secondary">
                      {exp.title}
                    </span>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Code */}

        <div className="block md:hidden w-full px-6">
          <div className="relative flex flex-col gap-30">
            <motion.div
              className="absolute left-27 top-1 w-1 h-[85%] bg-primary/40 rounded"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
            />

            {experiences.map((exp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative pl-12"
              >
                <div className="absolute left-20 top-1 h-15 w-15 rounded-full bg-background border border-primary/40 flex items-center justify-center">
                  {exp.image ? (
                    <div className="relative h-10 w-10">
                      <Image
                        src={exp.image}
                        alt={exp.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary" />
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9, rotateZ: 0 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1, rotateZ: -2 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: 0.6 + i * 0.2,
                    type: "spring",
                    stiffness: 120,
                    damping: 12,
                  }}
                  className="bg-primary/10 backdrop-blur border border-primary/20 rounded-lg p-4 shadow-md  ml-30 text-xs text-center w-40"
                >
                  <p className="text-primary font-semibold">{exp.role}</p>
                  <p className="text-xs text-secondary">{exp.year}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Element>
  );
}
