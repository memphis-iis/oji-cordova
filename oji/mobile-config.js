// This section sets up some basic app metadata, the entire section is optional.
App.info({
    id: 'com.uofmiis.ojicordova',
    name: 'Oji',
    description: 'Mental Health Assessment App',
    author: 'UofM Institute for Intelligent Systems'
  });
  
  //set icon for android
  App.icons({
    'android_mdpi': 'resources/icons/mipmap-mdpi/icon.png',
    'android_hdpi': 'resources/icons/mipmap-hdpi/icon.png',
    'android_xhdpi': 'resources/icons/mipmap-xhdpi/icon.png',
    'android_xxhdpi': 'resources/icons/mipmap-xxhdpi/icon.png',
    'android_xxxhdpi': 'resources/icons/mipmap-xxxhdpi/icon.png'
  });

  //set splash screen for android
  App.launchScreens({
    'android_mdpi_portrait': 'resources/splash/mipmap-mdpi/splash.png',
    'android_hdpi_portrait': 'resources/splash/mipmap-hdpi/splash.png',
    'android_xhdpi_portrait': 'resources/splash/mipmap-xhdpi/splash.png',
    'android_xxhdpi_portrait': 'resources/splash/mipmap-xxhdpi/splash.png',
    'android_xxxhdpi_portrait': 'resources/splash/mipmap-xxxhdpi/splash.png'
  });

  // Set PhoneGap/Cordova preferences.
  App.configurePlugin('phonegap-plugin-push', {
    SENDER_ID: '1019382444274'
  })

  App.accessRule('*');
  App.appendToConfig(`
  <platform name="android">
    <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
     <application android:usesCleartextTraffic="true" />
    </edit-config>
  </platform>
  `);


App.setPreference('android-targetSdkVersion', '30')
App.setPreference('StatusBarOverlaysWebView', 'true')
App.setPreference('StatusBarStyle', 'lightcontent')
App.setPreference('Orientation', 'portrait')
// App.setPreference('StatusBarBackgroundColor', '#111')
App.setPreference('KeyboardDisplayRequiresUserAction', 'false')

App.setPreference('SplashMaintainAspectRatio', 'true') // Android
App.setPreference('ShowSplashScreenSpinner', 'false') // IOS
App.setPreference('iosPersistentFileLocation', 'Library') // IOS
App.setPreference('DisallowOverscroll', 'true') // IOS
App.setPreference('webviewbounce', 'false')


App.appendToConfig(`
<platform name="android">
  <resource-file target="/app/google-services.json" src="../../../cordova-build-override/google-services.json"/>
</platform>
`)

App.setPreference("GradlePluginGoogleServicesEnabled", true);
App.setPreference("GradlePluginGoogleServicesVersion", "4.3.10");