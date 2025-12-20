/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        config.resolve.alias.canvas = false;

        // For sql.js WASM support
        if (isServer) {
            config.externals.push('sql.js');
        }

        return config;
    },
    transpilePackages: [],
    experimental: {
        serverComponentsExternalPackages: ['sql.js']
    }
}

module.exports = nextConfig
