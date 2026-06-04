module.exports = {
  apps: [
    {
      name: "print-api",
      cwd: "/home/dir/print/packages/api",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "print-web",
      cwd: "/home/dir/print",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        API_INTERNAL_URL: "http://127.0.0.1:4000",
      },
    },
  ],
};
