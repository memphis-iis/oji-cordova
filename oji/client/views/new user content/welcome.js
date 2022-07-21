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
    }
})

Template.welcome.events({
    'click #startJourney': function(){
        const user = Meteor.user();
        const org = Orgs.findOne();
        if(user && org){
            const assignment = org.newUserAssignments[0];
            if(assignment){
                const target = `/${assignment.type}/` + assignment.assignment;
                Meteor.call('setCurrentAssignment', {id: assignment.assignment, type: assignment.type, newUserAssignment: true}, function(err, res){
                    if(err){
                        console.log(err);
                    } else {
                        Router.go(target);
                    }
                });
            }
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