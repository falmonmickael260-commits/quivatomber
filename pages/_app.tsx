import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { SoundProvider } from "@/hooks/useSound";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>QUI VA TOMBER ?</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#05030a" />
        <meta
          name="description"
          content="QUI VA TOMBER ? — Une question. Un choix. Un joueur de moins. Le jeu télévisé multijoueur en ligne."
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2305030a'/%3E%3Ctext x='50' y='68' font-size='60' text-anchor='middle' fill='%23e3122f' font-family='Arial Black'%3E%3F%3C/text%3E%3C/svg%3E"
        />
      </Head>
      <SoundProvider>
        <Component {...pageProps} />
      </SoundProvider>
    </>
  );
}
