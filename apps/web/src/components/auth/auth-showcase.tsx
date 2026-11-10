import Image from "next/image";
import loginBackground from "@/app/(auth)/assets/bg-login.jpg";
import { Logo } from "@/components/logo";
import Link from "next/link";

const GUESTS = ["Hana Sato", "Jonas Berg", "Amira Haddad"];

export function AuthShowcase() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl py-8">
      <Image
        src={loginBackground}
        alt=""
        fill
        sizes="50vw"
        placeholder="blur"
        className="pointer-events-none object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      <header className="relative z-10 flex flex-col gap-6 px-8">
        <Link href="/" className="flex w-fit items-center gap-3">
          <Logo className="size-28" />
          <span className="text-5xl font-bold">Meeteora</span>
        </Link>
        <h2 className="text-4xl font-bold text-white xl:text-5xl/15.5">
          Your calendar, booked for you.
        </h2>
        <p className="text-xl text-white">
          Share one link, let guests pick a time, and watch every booking land
          on your dashboard.
        </p>
      </header>

      <div className="relative z-10 mx-8 h-62 overflow-hidden rounded-2xl">
        <svg
          width="4000"
          height="249"
          viewBox="-2906 0 4000 249"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute right-0 -z-1 select-none"
        >
          <path
            d="M0.263672 16.8809C0.263672 8.0443 7.42712 0.880859 16.2637 0.880859H786.394H999.115C1012.37 0.880859 1023.12 11.626 1023.12 24.8808L1023.12 47.3809C1023.12 60.6357 1033.86 71.3809 1047.12 71.3809H1069.6C1082.85 71.3809 1093.6 82.126 1093.6 95.3809L1093.6 232.881C1093.6 241.717 1086.43 248.881 1077.6 248.881H16.2637C7.42716 248.881 0.263672 241.717 0.263672 232.881V16.8809Z"
            fill="#fff"
          />
          <rect x="-2906" y="0.88" width="2930" height="248" fill="#fff" />
        </svg>
        <div className="absolute top-0 right-0 flex size-15 items-center justify-center rounded-2xl bg-[#F5F5F5]">
          <Logo className="size-9 text-black" />
        </div>

        <div className="flex flex-col gap-5 p-6 text-black">
          <p className="line-clamp-2 pr-12 text-3xl font-bold">
            Scheduling without the back-and-forth
          </p>
          <p className="line-clamp-2 text-lg">
            Booking links, event pages and live notifications, all in one place.
          </p>
          <div className="flex -space-x-4 self-end" aria-hidden="true">
            {GUESTS.map((name) => (
              <span
                key={name}
                className="flex size-12 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-white ring-2 ring-white"
              >
                {name[0]}
              </span>
            ))}
            <span className="flex size-12 items-center justify-center rounded-full bg-[#F5F5F5] text-xs font-medium ring-2 ring-white">
              +12
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
