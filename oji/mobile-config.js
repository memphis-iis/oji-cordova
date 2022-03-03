// This section sets up some basic app metadata, the entire section is optional.
App.info({
    id: 'com.uofmiis.ojicordova',
    name: 'Oji',
    description: 'Mental Health Assessment App',
    author: 'UofM Institute for Intelligent Systems'
  });
  
  // Set up resources such as icons and launch screens.
  App.icons({
    'iphone_2x': 'icons/icon-60@2x.png',
    'iphone_3x': 'icons/icon-60@3x.png',
    // More screen sizes and platforms...
  });
  
  // Before Meteor 2.6 we had to pass device specific splash screens for iOS, but this behavior was dropped in favor of story board images.
  App.launchScreens({
      // iOS
      // For most cases you will only need to use the 'ios_universal' and 'ios_universal_3x'.
      'ios_universal': { src: 'splash/Default@2x.png', srcDarkMode: 'splash/Default@2x~dark.png' }, // (2732x2732) - All @2x devices, if device/mode specific is not declared
      'ios_universal_3x': 'splash/Default@3x.png', // (2208x2208) - All @3x devices, if device/mode specific is not declared

      // Android
      'android_mdpi_portrait': 'splash/android_mdpi_portrait.png', // (320x480)
      'android_mdpi_landscape': { src: 'splash/android_mdpi_landscape.png', srcDarkMode: 'splash/android_mdpi_landscape-night.png' }, // (480x320)
      'android_hdpi_portrait': 'splash/android_hdpi_portrait.png', // (480x800)
      'android_hdpi_landscape': 'splash/android_hdpi_landscape.png', // (800x480)
      'android_xhdpi_portrait': 'splash/android_xhdpi_portrait.png', // (720x1280)
      'android_xhdpi_landscape': 'splash/android_xhdpi_landscape.png', // (1280x720)
      'android_xxhdpi_portrait': { src: 'splash/android_xxhdpi_portrait.png', srcDarkMode: 'splash/android_xxhdpi_portrait-night.png'}, // (960x1600)
      'android_xxhdpi_landscape': 'splash/android_xxhdpi_landscape.png', // (1600x960)
      'android_xxxhdpi_portrait': 'splash/android_xxxhdpi_portrait.png', // (1280x1920)
      'android_xxxhdpi_landscape': 'splash/android_xxxhdpi_landscape.png', // (1920x1280)
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
      <resource-file target="google-services.json" src="./resourcesd/android/google-services.json"/>
  </platform>
  `)