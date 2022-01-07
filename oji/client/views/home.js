import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.home.helpers({
    'userIsUser' : () => Roles.userIsInRole(Meteor.userId(), 'user'),
    'userIsAdmin' : () => Roles.userIsInRole(Meteor.userId(), 'admin'),
    'userIsSupervisor' : () => Roles.userIsInRole(Meteor.userId(), 'supervisor'),
    'userHasSeenFirstAssessment' : () => Meteor.user().hasCompletedFirstAssessment
});