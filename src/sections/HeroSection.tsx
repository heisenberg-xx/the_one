"use client";
import React from "react";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { Button } from "@/components/ui/button";
import { Typewriter } from "react-simple-typewriter";
import Image from "next/image";
import { motion } from "framer-motion";
import { Element } from "react-scroll";
const HeroSection = () => {
  return (
    <Element name="home">
      <section className="relative w-screen h-[86dvh] overflow-hidden border-b border-primary/20">
        <div className="absolute inset-0 z-0">
          <ShaderGradientCanvas>
            <ShaderGradient
              control="query"
              urlString="https://shadergradient.co/customize?animate=on&axesHelper=off&brightness=0.3&cAzimuthAngle=180&cDistance=2.8&cPolarAngle=80&cameraZoom=4.6&color1=%23606080&color2=%23239ba7&color3=%23212121&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=80&frameRate=10&gizmoHelper=hide&grain=off&lightType=3d&pixelDensity=2&positionX=0&positionY=0&positionZ=0&range=disabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=50&rotationY=0&rotationZ=-60&shader=defaults&type=sphere&uAmplitude=0&uDensity=1.5&uFrequency=0&uSpeed=0.1&uStrength=0.5&uTime=8&wireframe=false"
            />
          </ShaderGradientCanvas>
        </div>

        <div className="relative z-20 h-full flex flex-col justify-around items-center px-6 py-4 ">
          {/* Top Text */}
          <div className="space-y-3 ">
            <h1 className="font-light text-4xl text-secondary text-left">
              Hey There, I'm
            </h1>

            <h2 className="font-ultra text-6xl md:text-7xl text-primary/80 uppercase">
              Rajesh Ande
            </h2>

            <p className="text-secondary lowercase text-xl">
              <Typewriter
                words={[
                  "a full stack dev",
                  "a frontend dev",
                  "a debugger",
                  "a backend dev",
                ]}
                loop
                cursor
                cursorStyle="|"
                typeSpeed={70}
                deleteSpeed={50}
                delaySpeed={1000}
              />
            </p>
            <motion.div
              whileHover={{
                // translateY: -2,
                scaleX: 0.95,
                transition: { type: "spring", stiffness: 300, damping: 5 },
              }}
              className="inline-block"
            >
              <Button
                variant="custom"
                className="mt-2 lowercase font-semibold tracking-wide text-lg"
              >
                Resume
              </Button>
            </motion.div>
          </div>

          {/* Bottom Image */}
          <div className="relative w-full flex justify-center ">
            <motion.div className="relative w-100 h-100 ">
              <Image src="/rajesh2.png" alt="Rajesh Ande" fill priority />
            </motion.div>
          </div>
        </div>
      </section>
    </Element>
  );
};

export default HeroSection;
