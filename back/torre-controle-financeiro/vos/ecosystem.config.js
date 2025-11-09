module.exports = {
  apps: [{
    name: 'torre-controle-financeiro',
    script: 'npx',
    args: 'serve -s dist -l 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
