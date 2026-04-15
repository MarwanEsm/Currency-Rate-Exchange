/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  // Keep tracing rooted to this project to avoid workspace lockfile warnings.
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
