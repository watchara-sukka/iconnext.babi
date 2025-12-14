/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.externals.push('better-sqlite3');
        config.resolve.alias.canvas = false;
        return config;
    },
    transpilePackages: [], // Added transpilePackages as an empty array, as no specific packages were provided in the instruction.
}

module.exports = nextConfig
