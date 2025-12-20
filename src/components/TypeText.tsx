"use client";

import { motion } from "framer-motion";

const TypeText = ({ text }: { text: string }) => {
  const letters = Array.from(text);

  return (
    <motion.span
      className="text-primary font-semibold inline-flex relative mx-1"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.04,
          },
        },
      }}
    >
      {letters.map((char, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default TypeText;
