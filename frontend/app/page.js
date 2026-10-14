import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <section className="relative mx-auto flex min-h-screen items-center justify-center overflow-hidden bg-black md:max-w-[1600px]">
        <Image
          src="/event-hero-mobile.png"
          alt="Chimbo La Vijana Brunch Ki-Gen Z event banner"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center md:hidden"
        />
        <Image
          src="/event-hero.jpeg"
          alt="Chimbo La Vijana Brunch Ki-Gen Z event banner"
          fill
          priority
          sizes="100vw"
          className="hidden object-contain object-center md:block"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.04),transparent_45%,rgba(0,0,0,0.32))]" />
        <div className="absolute inset-x-0 bottom-[5.5%] z-10 flex justify-center px-5 sm:bottom-[7%]">
          <Button
            asChild
            className="h-12 rounded-full border-2 border-white/70 bg-[#f4a300] px-7 text-base font-black uppercase text-[#0a5d35] shadow-2xl hover:bg-[#ffbd1c] sm:h-14 sm:px-9 sm:text-lg"
            size="lg"
          >
            <Link href="/register">
              Jisajili sasa <ArrowRight size={20} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

