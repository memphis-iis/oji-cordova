module.exports = {
  servers: {
    one: {
      host: 'ojis-journey.com',
      username: 'ubuntu',
      pem: '~/oji/oji-staging.pem'
    },
  },
  app: {
    name: 'Oji',
    path: '../',
    volumes: {
      '/ojidocs' : '/ojidocs',
    },
    docker: {
      image: 'zodern/meteor:root',
      prepareBundle: true,
      useBuildKit: true,

    },
    servers: {
      one: {},
    },
    buildOptions: {
      serverOnly: true,
      server: "https://ojis-journey.com",
      allowIncompatibleUpdate: true
    },
    env: {
      ROOT_URL: 'https://ojis-journey.com',
      MONGO_URL: 'mongodb://localhost/meteor'
    }
  },
  mongo: {
    version: '3.6.1',
    servers: {
      one: {},
    }
  },
  proxy: {
    domains: 'ojis-journey.com',
    ssl: {
      forceSSL: true,
      letsEncryptEmail: 'jrhaner@memphis.edu'
    }
  }
}