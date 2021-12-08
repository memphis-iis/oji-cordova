import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

// React Implemetation
// Template.DefaultLayout.onRendered(() => {
//     render(<App/>, document.getElementById('react-target'));
// });

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
      return Meteor.users.findOne(Meteor.userId()).firstname;
    }
  }
});