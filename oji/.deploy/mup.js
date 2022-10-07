module.exports = {
    servers: {
      one: {
        host: '54.212.187.130',
        username: 'ubuntu',
        pem: '~/oji/oji-staging.pem'
      }
    },
    app: {
      name: 'Oji',
      path: '../',
      docker: {
        image: 'zodern/meteor:root',
      },
      servers: {
        one: {}
      },
      buildOptions: {
        serverOnly: true
      },
      env: {
        ROOT_URL: 'http://54.212.187.130',
        MONGO_URL: 'mongodb://localhost/meteor'
      }
    },
    mongo: {
      version: '3.6.23',
      servers: {
        one: {}
      }
    }
  }
  