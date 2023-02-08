module.exports = {
    servers: {
      one: {
        host: '52.89.69.112',
        username: 'ubuntu',
        pem: '~/oji/oji-staging.pem'
      }
    },
    app: {
      name: 'Oji',
      path: '../',
      docker: {
        image: 'zodern/meteor:root',
        prepareBundle: true,
        useBuildKit: true
      },
      servers: {
        one: {}
      },
      buildOptions: {
        serverOnly: true
      },
      env: {
        ROOT_URL: 'http://ojis-journey.com',
        MONGO_URL: 'mongodb://localhost/meteor'
      }
    },
    mongo: {
      version: '3.6.23',
      servers: {
        one: {}
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
  