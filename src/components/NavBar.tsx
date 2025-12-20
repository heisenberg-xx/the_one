"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "react-scroll";
import { cn } from "@/lib/utils";

const items = [
  { label: "about", to: "about" },
  { label: "experience", to: "experience" },
  { label: "skills", to: "skills" },
  { label: "works", to: "works" },
  { label: "say hi", to: "say-hi" },
];

const icons = [
  {
    href: "//www.linkedin.com/in/rajeshande2004/",
    src: "/icons/linkedin.svg",
    alt: "LinkedIn",
    size: 30,
  },
  {
    href: "https://github.com/heisenberg-xx",
    src: "/icons/github.svg",
    alt: "GitHub",
    size: 30,
    className: "invert",
  },
  {
    href: "mailto:raajeshande@gmail.com",
    src: "/icons/gmail.svg",
    alt: "Gmail",
    size: 27,
    className: "rounded-full",
  },
];

const NavBar = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="sticky top-0 z-50  backdrop-blur-sm w-screen">
      <div className="flex justify-center items-center py-3 h-16">
        <div className="flex-1" />
        <nav className="flex-1">
          <ul
            className="flex justify-around items-center"
            onMouseLeave={() => setHovered(null)}
          >
            {items.map((item, i) => (
              <li
                key={item.to}
                className={cn(
                  active === item.to || hovered === item.to ? "text-primary font-semibold" : "",
                  " group relative cursor-pointer text-md text-secondary hover:text-primary"
                )}
                onMouseEnter={() => setHovered(item.to)}
              >
                <Link
                  to={item.to}
                  smooth
                  duration={700}
                  offset={-120} // navbar height
                  spy
                  onClick={() => setHovered(item.to)}
                  onSetActive={(id) => setActive(id)}
                >
                  {item.label}
                </Link>

                {(hovered === item.to || active === item.to) && (
                  <motion.span
                    layoutId="nav-underline"
                    className={cn(
                      hovered === item.to || active === item.to
                        ? "text-primary"
                        : "",
                      "absolute group-hover:text-primary left-0 -bottom-1 h-0.5 w-full bg-current"
                    )}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 flex justify-center gap-3">
          {icons.map((icon) => (
            <motion.a
              key={icon.href}
              href={icon.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src={icon.src}
                alt={icon.alt}
                width={icon.size}
                height={icon.size}
                className={icon.className}
              />
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavBar;
