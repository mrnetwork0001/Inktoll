module.exports = {
  apps: [
    {
      name: 'inktoll-backend',
      script: 'npm',
      args: 'run dev:server',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'inktoll-agent',
      script: 'npm',
      args: 'run dev:agent',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
