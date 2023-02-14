import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor'

Orgs = new Mongo.Collection('organizations');
Assessments  = new Mongo.Collection('assessments');
Trials = new Mongo.Collection('trials');
Modules = new Mongo.Collection('modules');
ModuleResults = new Mongo.Collection('modresults');
Events = new Mongo.Collection('events');
Journals = new Mongo.Collection('journals');
Exercises =  new Mongo.Collection('exercises');
Chats = new Mongo.Collection('chats');
Emails = new Mongo.Collection('emails');