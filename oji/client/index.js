import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import WebPush, { CordovaPush } from 'meteor/activitree:push';

Template.DefaultLayout.onCreated(function() {

})

Meteor.startup(() => {
  if (Meteor.isCordova) {
    // Check cordova-push-plugin for all options supported.
    // The configuration object is used to initialize Cordova Push on the device.
    CordovaPush.Configure({
      appName: 'Oji',
      debug: true, // Turns on various console messages in the Cordova console.
      android: {
        alert: true,
        badge: true,
        sound: true,
        vibrate: true,
        clearNotifications: true,
        icon: 'statusbaricon',
        iconColor: '#337FAE',
        forceShow: true
      },
      ios: {
        alert: true,
        badge: true,
        sound: true,
        clearBadge: true,
        topic: 'com.your_app_id' // your IOS app id.
      }
    })
  } else {
    WebPush.Configure({
      appName: 'Oji', // required
      debug: true, 
      firebase: {
        apiKey: '________',
        authDomain: '_______',
        projectId: '________________',
        messagingSenderId: '_________________',
        appId: '_______________',
      },
      publicVapidKey: '____________'
    })
  }
})

Template.DefaultLayout.events({
  'click #logoutButton': function(event) {
    event.preventDefault();
    Meteor.logout();
    Router.go("/");
  },

  'click #navbar-brand': function(event){
    event.preventDefault();
    Router.go("/");
  }
});

Template.DefaultLayout.helpers({
  'organization': () => Orgs.findOne(),
});
