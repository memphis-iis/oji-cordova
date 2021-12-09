import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.DefaultLayout.onCreated(function() {
  this.autorun(() => {
    Meteor.subscribe('userFirstname');
  });
})

Template.DefaultLayout.events({
  'click #logoutButton': function(event) {
    event.preventDefault();
    Meteor.logout();
  }
});

Template.DefaultLayout.helpers({
  username: function() {
    if (!Meteor.userId()) {
      return false;
    } else {
      return Meteor.users.findOne().firstname;
    }
  }
});