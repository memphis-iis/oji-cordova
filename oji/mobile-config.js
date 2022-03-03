// This section sets up some basic app metadata, the entire section is optional.
App.info({
    id: 'com.uofmiis.ojicordova',
    name: 'Oji',
    description: 'Mental Health Assessment App',
    author: 'UofM Institute for Intelligent Systems'
  });
  
  // Set PhoneGap/Cordova preferences.
  App.setPreference('BackgroundColor', '0xff0000ff');
  App.setPreference('HideKeyboardFormAccessoryBar', true);
  App.setPreference('Orientation', 'default');
  App.setPreference('Orientation', 'all', 'ios');
  
  App.configurePlugin('phonegap-plugin-push', {
    SENDER_ID: 'xxxxxxxxxxxxxxxx'
  })
  
  App.appendToConfig(`
  <platform name="android">
      <resource-file target="google-services.json" src="./resources/android/google-services.json"/>
  </platform>
  `)