import { Template }    from 'meteor/templating';
import { Meteor } from 'meteor/meteor';

Template.welcome.helpers({
    'assignment': function(){
        const user = Meteor.user();
        if(user){
            assigned = user.assigned;
            assignment = {};
            if(assigned.length === 0){
                assignment = false;
            } else {
                assignment.show = true;
                assignment.isAssessment = false;
                assignment.isModule = false;
                if(assigned[0].type == "assessment"){
                    assignment = Assessments.findOne({_id: assigned[0].assignment});
                    assignment.isAssessment = true;
                }

                if(assigned[0].type == "module"){
                    assignment = Modules.findOne({_id: assigned[0].assignment});
                    assignment.isModule = true;
                }
            }
            return assignment;
        }
    },
    'startedJourney': function(){
        const user = Meteor.user();
        if(user){
            return user.journeyStarted;
        }
    }
})

Template.welcome.events({
    'click #startJourney': function(){
        const user = Meteor.user();
        const org = Orgs.findOne();
        //set user's startedJourney to true
        Meteor.call('startJourney', user._id);
        if(user && org){
            //get user assignments
            assignments = user.assigned;
            //if the length of the assignments array is greater than 1
            if(assignments.length >= 1){
                //get first assignment
                assignment = assignments[0];
                Meteor.call('setCurrentAssignment', assignment.assignment);
                target = `/${assignment.type}/` + assignment.assignment;
                Router.go(target);
            } else {
                Router.go('/')
            }
        } else {
            Router.go('/');
        }
    },
    'click #continueJourney': function(){
        //pending implementation
    }
})


Template.welcome.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})