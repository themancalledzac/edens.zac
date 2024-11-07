import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    sassOptions: {
        includePaths: [path.join( process.cwd(), 'styles' )],
    },
    images: {
        domains: ['localhost'], // Add your domain here
        formats: ['image/webp'],
        // remotePatterns
    },
    // Add webpack configuration to handle caching
    webpack: ( config, { dev, isServer } ) => {
        // Custom webpack config if needed
        return config
    },
}

export default nextConfig
