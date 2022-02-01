import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor'

//Define Collections
Orgs = new Mongo.Collection('organizations');
Assessments  = new Mongo.Collection('assessments');
Trials = new Mongo.Collection('trials');
Modules = new Mongo.Collection('modules');
ModuleResults = new Mongo.Collection('modresults');

