// This section sets up some basic app metadata, the entire section is optional.
App.info({
    id: 'com.uofmiis.ojicordova',
    name: 'Oji',
    description: 'Mental Health Assessment App',
    author: 'UofM Institute for Intelligent Systems'
  });
  

  // Set PhoneGap/Cordova preferences.
  App.accessRule('*');
  App.appendToConfig(`
  <platform name="android">
    <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
     <application android:usesCleartextTraffic="true" />
    </edit-config>
  </platform>
  `)