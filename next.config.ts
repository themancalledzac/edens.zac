import type {NextConfig} from 'next'
import path from 'path'
import * as process from "process";

const config: NextConfig = {
    reactStrictMode: true,
    sassOptions: {
        includePaths: [path.join(process.cwd(), 'styles')],
    },
    images: {
        domains: ['localhost'], // Add your domain here
        formats: ['image/webp'],
    },
}

export default config;
