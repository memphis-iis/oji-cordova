import { Template }    from 'meteor/templating';

Template.congrats.helpers({
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
    }
})

Template.congrats.events({
    'click #startJourney': function(){
            Router.go('/');
    },
    'click #continueJourney': function(){
        //get user assignments
        const user = Meteor.user().assigned;
        //if the length of the assignments array is greater than 1
        if(user.length >= 1){
            //get first assignment
            const assignment = user[0];
            Meteor.call('setCurrentAssignment', assignment.assignment);
            const target = `/${assignment.type}/` + assignment.assignment;
            Router.go(target);
        } else{
            Router.go('/');
        }
    },
    'click #view-transcript': function(){
        //show transcript div
          $('#transcript').show();
     }
})


Template.congrats.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})