import NavBar from "@/components/NavBar";
import About from "@/sections/About";
import Experience from "@/sections/Experience";
import HeroSection from "@/sections/HeroSection";
import { SayHi } from "@/sections/SayHi";
import Skills from "@/sections/Skills";
import { Works } from "@/sections/Works";
import Image from "next/image";

export default function Home() {
  return (
    <main className="font-light space-y-12  mt-10">
      <HeroSection />
      <About />
      <Experience />
      <Skills />
      <Works />
      <SayHi />
    </main>
  );
}
