/** @type {import('next').NextConfig} */
const { App } = require('@pezi-bot/bot');

const nextConfig = {
  reactStrictMode: true,
};

App.start();

module.exports = nextConfig;
