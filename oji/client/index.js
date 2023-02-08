import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { firebase } from 'meteor/activitree:push';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import { Session } from 'meteor/session';
import { CordovaPush } from 'meteor/activitree:push';


Meteor.startup(() => {
  //get firebase config from meteor call and return result to firebaseConfig session variable
  Meteor.call('getFirebaseConfig', function(error, result){
      //initialize firebase
      const app = initializeApp(result);    
      //get firebase analytics object
      const analytics = getAnalytics(app);
      //ask user for permission to send notifications
      Notification.requestPermission().then(function(permission) {
        if(permission === 'granted'){
          console.log("Permission Granted");
          //get firebase messaging object
          const messaging = getMessaging(app);
          //get token
          getToken(messaging,
            {
              vapidKey: result.publicVapidKey
            }
          ).then((currentToken) => {
            console.log("currentToken: " + currentToken);
            if (currentToken) {
              //send token to server
              Meteor.call('sendTokenToServer', currentToken);
            }
          }).catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
          });
        } else {
          console.log("Permission Denied");
        }
      });
  });
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