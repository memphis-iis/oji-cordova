import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import WebPush, { CordovaPush } from 'meteor/activitree:push';
import { webPushSubscribe } from 'meteor/activitree:push';

const cordovaConfig ={
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
    // clearBadge: false,
    // topics: ['messages', 'notifications'],
    // messageKey: 'message',
    // titleKey: 'title'
    // topics: ['messages', 'notifications']
  },
  ios: {
    alert: true,
    badge: true,
    sound: true,
    clearBadge: true,
    topic: 'com.uofmiis.ojicordova' // your IOS app id.
  }
};

Accounts.onLogin(function(){
  if(!Meteor.isCordova){
    Notification.requestPermission(function(status) {
      console.log('Notification permission status:', status);
      Meteor.call('getFirebaseConfig', function(err, webPushConfig){
        if(err){
          console.log(err);
        } else {
          WebPush.Configure({
            appName: 'Oji',
            firebase: webPushConfig,
            debug: true,
            publicVapidKey: webPushConfig.publicVapidKey  
          });
          webPushSubscribe();
        }
      });
    });
  } else {
    CordovaPush.Configure(cordovaConfig);
    //create android channel
    CordovaPush.createChannel({
      id: Meteor.userId(),
      description: 'Oji Notifications',
      importance: 4,
      vibration: true
    });
  }
});

Meteor.startup(() => {
  Meteor.subscribe('files.images.all');
})


Template.DefaultLayout.helpers({
  'footer': function(){
      footer.copyright = "Copyright 2022";
      footer.message = "Oji is a collaboration between the University of Memphis, The Institute for Intelligent Systems, and the University of Southern Mississippi."
      return footer;
  }
})
Template.DefaultLayout.events({
  'click #logoutButton': function(event) {
    event.preventDefault();
    Router.go("/logout");
  },

  'click #navbar-brand': function(event){
    event.preventDefault();
    Router.go("/");
  }
});

Template.DefaultLayout.helpers({
  'currentUserAbrieviation': function(){
    user = Meteor.user();
    if(user){
      //get abbreviated name
      firstName = user.firstname;
      lastName = user.lastname;
      if(firstName && lastName){
        user.abbreviatedName = firstName.charAt(0) + lastName.charAt(0);
      } else {
        user.abbreviatedName = user.username;
      }
      console.log("user.abbreviatedName: " + user.abbreviatedName);
      return user.abbreviatedName;
    }
  },
  'organization': function () {
     orgs = Orgs.findOne();
     if(orgs){
      orgSplit = orgs.orgName.split(" ");
      newOrgName = orgs.orgName;
      if(orgSplit.length > 1){
         newOrgName = "";
         for(i = 0; i < Math.max(orgSplit.length - 1, 2); i++){
           newOrgName += orgSplit[i].charAt(0);
         }
      } else {
         newOrgName = orgs.orgName.substring(0,Math.min(3, orgs.orgName.length));
      }
      orgs.orgNameTruncated = newOrgName;
      return orgs;
     }
  },
  'messageCount': function(){
    return Chats.find({status: 'unread'}).count();
  }
});

Template.DefaultLayout.onRendered(function() {
  Meteor.subscribe('chats');
});