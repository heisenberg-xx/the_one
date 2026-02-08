"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Link, scrollSpy } from "react-scroll";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";

const items = [
  { label: "about", to: "about", spy: true },
  { label: "experience", to: "experience", spy: true },
  { label: "skills", to: "skills", spy: true },
  { label: "works", to: "works", spy: true },
  { label: "say hi", to: "say-hi", spy: true },
];

const icons = [
  {
    href: "//www.linkedin.com/in/rajeshande2004/",
    src: "/icons/media/linkedin.svg",
    alt: "LinkedIn",
    size: 28,
  },
  {
    href: "https://github.com/heisenberg-xx",
    src: "/icons/media/github.svg",
    alt: "GitHub",
    size: 28,
    className: "invert",
  },
  {
    href: "mailto:raajeshande@gmail.com",
    src: "/icons/media/gmail.svg",
    alt: "Gmail",
    size: 26,
    className: "rounded-full",
  },
];

const NavBar = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    scrollSpy.update();
    setActive(null);
  }, []);

  return (
    <div className="sticky top-0 z-50 w-screen backdrop-blur-sm">
      <div className="flex h-16 items-center ">
        {/* Left spacer */}
        <div className="flex-1 md:flex hidden" />

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex flex-1 justify-center">
          <ul
            className="flex items-center  gap-6"
            onMouseLeave={() => setHovered(null)}
          >
            {items.map((item) => {
              const isActive = hovered === item.to || active === item.to;

              return (
                <li
                  key={item.to}
                  className="relative cursor-pointer px-3 py-1"
                  onMouseEnter={() => setHovered(item.to)}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-primary/10"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}

                  <Link
                    to={item.to}
                    smooth
                    duration={700}
                    offset={-120}
                    spy={item.spy}
                    onClick={() => setHovered(item.to)}
                    onSetActive={(id) => setActive(id)}
                    className={cn(
                      "relative z-10 transition-colors text-sm",
                      isActive
                        ? "text-primary font-semibold"
                        : "text-secondary hover:text-primary "
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* right dummy div */}
        <div className="flex flex-1 md:justify-end justify-between md:px-0 px-5 sm:w-full items-center gap-4">
          {/* media icons */}
          <div className="flex md:flex-1 justify-center  gap-3">
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

          {/* hamburger for mobile ) */}

          <Button
            variant="ghost"
            className="md:hidden lg:hidden text-primary block "
            onClick={() => setOpen((p) => !p)}
            
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex text-primary md:hidden "
                >
                  <X size={22} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex text-primary md:hidden"
                >
                  <Menu size={22} />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* moBile meNu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-transparent backdrop-blur-md border-t border-primary/20"
          >
            <ul className="flex flex-col gap-2 py-4 px-6">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  smooth
                  duration={600}
                  offset={-120}
                  spy
                  onClick={() => setOpen(false)}
                  className="py-2 text-secondary hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavBar;
