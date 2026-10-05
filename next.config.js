const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // `stats-gl` (dépendance de @react-three/drei) embarque sa propre copie
    // de three. Deux copies dans le bundle cassent tous les `instanceof` de
    // three.js : le rendu WebGL s'initialise puis ne dessine rien, sans
    // erreur — on voyait un canvas vide. On force donc une résolution unique.
    config.resolve.alias = {
      ...config.resolve.alias,
      three: path.resolve(__dirname, "node_modules/three"),
    };
    return config;
  },
};

module.exports = nextConfig;
