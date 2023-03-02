module.exports = {
    servers: {
      one: {
        host: 'ojis-journey.com',
        username: 'ubuntu',
        pem: '~/oji/oji-staging.pem'
      }
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
      buildOptions: {
        debug: true,
        mobileSettings: {
          public:{
              author:["testAdmin@memphis.edu","jrhaner@memphis.edu","rawhite2@memphis.edu"]
          },
          firebase:{
              databaseURL:"https://ojiapp-85dba-default-rtdb.firebaseio.com",
              senderId:"1019382444274",
              appId: "1:303163071032:android:f7df02da7697cd702664cd",
              projectId:"ojiapp-85dba"
          }
        },
        executable: 'meteor'
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
  