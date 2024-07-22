/** @type {import('next').NextConfig} */
const path = require( 'path' )
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    sassOptions: {
        includePaths: [path.join( __dirname, 'styles' )],
    },
    images: {
        domains: ['localhost'], // Add your domain here
        formats: ['image/webp'],
    },
}

module.exports = nextConfig
