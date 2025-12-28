"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Element } from "react-scroll";

export interface SkillItem {
  title: string;
  image: string;
  className: string;
  desc: string;
}

const items = [
  {
    title: "JavaScript",
    image: "/icons/skills/javascript.svg",
    className: "",
    desc: "This is where everything starts for me.",
  },
  {
    title: "TypeScript",
    image: "/icons/skills/typescript.svg",
    className: "",
    desc: "Helps me catch mistakes early and code with confidence.",
  },
  {
    title: "React",
    image: "/icons/skills/react.svg",
    className: "",
    desc: "My comfort zone for building interactive UIs.",
  },
  {
    title: "Next.js",
    image: "/icons/skills/next.svg",
    className: "invert",
    desc: "Feels like frontend and backend working together.",
  },
  {
    title: "Express",
    image: "/icons/skills/express.svg",
    className: "invert",
    desc: "Writing backend in Express makes my life easier.",
  },
  {
    title: "MongoDB",
    image: "/icons/skills/mongo.svg",
    className: "",
    desc: "Works well with how I think about data.",
  },
  {
    title: "Zustand",
    image: "/icons/skills/zustand.svg",
    className: "",
    desc: "I fell in love with it because it’s small yet efficient.",
  },
  {
    title: "Redux",
    image: "/icons/skills/redux.svg",
    className: "",
    desc: "Useful when apps grow big and structured.",
  },
  {
    title: "React Query",
    image: "/icons/skills/react query.svg",
    className: "",
    desc: "Takes care of server data so I don’t have to.",
  },
];


export default function Skills() {
  return (
    <Element name="skills">
      <section className="w-screen md:h-[86dvh] h-[50vh] flex items-center justify-center">
        <motion.div
          className="md:flex grid grid-cols-3 gap-7 px-6 py-4 rounded-2xl bg-primary/5 backdrop-blur-md"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.9, rotateZ: -10 }}
              whileInView={{ opacity: 1, scale: 1, rotateZ: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.04,
                duration: 0.18,
                ease: "easeOut",
              }}
            >
              <motion.div
                className="relative flex flex-col items-center cursor-pointer transform-gpu"
                whileHover="hover"
                initial="rest"
                animate="rest"
                variants={{
                  rest: { scale: 1 },
                  hover: { scale: 1.35, rotateZ: -10 },
                }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 32,
                  mass: 0.6,
                }}
              >
                {/* Tooltip – controlled by parent hover */}
                <motion.div
                  variants={{
                    rest: { opacity: 0, y: 4, rotateZ: -4 },
                    hover: { opacity: 1, y: -20 },
                  }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="
                  pointer-events-none absolute -top-7 px-2 py-0.5 text-[11px] rounded whitespace-nowrap bg-primary/10 backdrop-blur-md border border-primary/30 text-primary "
                >
                  {item.desc}
                </motion.div>

                <Image
                  src={item.image}
                  alt={item.title}
                  className={item.className}
                  width={40}
                  height={40}
                  draggable={false}
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </Element>
  );
}
