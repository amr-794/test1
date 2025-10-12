
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  api: {
    bodyParser: false // we'll handle with formidable for uploads
  }
}
module.exports = nextConfig
