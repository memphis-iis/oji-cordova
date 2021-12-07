import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import { Template } from 'meteor/templating';
import { App } from '../imports/ui/App.jsx';

Template.DefaultLayout.onRendered(() => {
    render(<App/>, document.getElementById('react-target'));
});

Template.DefaultLayout.events({
  'click #logoutButton': function() {
    event.preventDefault();
    Meteor.logout();
  }
});