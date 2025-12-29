"use client";
import React from "react";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { Button } from "@/components/ui/button";
import { Typewriter } from "react-simple-typewriter";
import Image from "next/image";
import { motion } from "framer-motion";
import { Element } from "react-scroll";
import { ArrowUpRight } from "lucide-react";

const HeroSection = () => {
  return (
    <Element name="home">
      <section className="relative w-screen h-[65vh] md:h-[86dvh] overflow-hidden border-b border-primary/20 ">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          {/* Desktop shader */}
          <div className="hidden md:block w-full h-full">
            <ShaderGradientCanvas>
              <ShaderGradient
                control="query"
                urlString="https://shadergradient.co/customize?animate=on&axesHelper=off&brightness=0.3&cAzimuthAngle=180&cDistance=2.8&cPolarAngle=80&cameraZoom=4.6&color1=%23606080&color2=%2373AF6F&color3=%23212121&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=80&frameRate=10&gizmoHelper=hide&grain=off&lightType=3d&pixelDensity=2&positionX=0&positionY=0&positionZ=0&range=disabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=50&rotationY=0&rotationZ=-60&shader=defaults&type=sphere&uAmplitude=0&uDensity=1.5&uFrequency=0&uSpeed=0.1&uStrength=0.5&uTime=8&wireframe=false"
              />
            </ShaderGradientCanvas>
          </div>

          {/* Mobile shader (lighter) */}
          <div className="block md:hidden w-full h-full">
            <ShaderGradientCanvas>
              <ShaderGradient
                control="query"
                urlString="https://shadergradient.co/customize?animate=on&axesHelper=off&brightness=0.2&cAzimuthAngle=180&cDistance=1.7&cPolarAngle=70&cameraZoom=3.8&color1=%23606080&color2=%2373AF6F&color3=%23212121&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=70&frameRate=6&gizmoHelper=hide&grain=off&lightType=3d&pixelDensity=1&positionX=0&positionY=0&positionZ=0&range=disabled&rangeEnd=30&rangeStart=0&reflection=0.05&rotationX=45&rotationY=0&rotationZ=-50&shader=defaults&type=sphere&uAmplitude=0&uDensity=1.2&uFrequency=0&uSpeed=0.08&uStrength=0.4&uTime=8&wireframe=false"
              />
            </ShaderGradientCanvas>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-between md:justify-between items-center px-4 md:px-6 pt-6 md:pt-4 md:pb-0">
          {/* Top Text */}
          <div className="space-y-2 md:space-y-3 text-center md:text-left max-w-xl">
            <h1 className="font-light text-2xl md:text-4xl text-secondary">
              Hey There, I'm
            </h1>

            <h2 className="font-ultra text-4xl md:text-6xl text-primary/80 uppercase">
              Rajesh Ande
            </h2>

            <p className="text-secondary lowercase text-base md:text-xl">
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
                scaleX: 0.95,
                transition: { type: "spring", stiffness: 300, damping: 5 },
              }}
              className="inline-block"
            >
              <a
                href="https://drive.google.com/file/d/1JaUBjU_8mxQTYUpiaTHYmQsd1Uad0-kU/view?usp=drivesdk"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="custom"
                  className="mt-3 lowercase tracking-wide text-sm md:text-md"
                >
                  Resume <ArrowUpRight className=" h-4 w-4" />
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Bottom Image */}
          <div className="relative w-full flex justify-center mb-0 md:mt-0">
            <motion.div className="relative w-70 h-70 md:w-95 md:h-95">
              <Image src="/rajesh2.png" alt="Rajesh Ande" fill priority />
            </motion.div>
          </div>
        </div>
      </section>
    </Element>
  );
};

export default HeroSection;
