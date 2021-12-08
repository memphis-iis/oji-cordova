import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor'

//Define Collections
Orgs = new Mongo.Collection('organizations');
Invites = new Mongo.Collection('organizationLinks')
