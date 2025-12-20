"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Element } from "react-scroll";

const items = ["Design", "Develop", "Deploy", "Scale"];

export default function Skills() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <Element name="skills">
      <section className="w-screen h-[86dvh] flex justify-center items-center border-b border-primary/20 scroll-mt-24">
     
      </section>
    </Element>
  );
}
