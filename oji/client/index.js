import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import { Template } from 'meteor/templating';
// import { App } from '../imports/ui/App.jsx';

// React Implemetation
// Template.DefaultLayout.onRendered(() => {
//     render(<App/>, document.getElementById('react-target'));
// });

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
      return Meteor.user().username;
    }
  }
});