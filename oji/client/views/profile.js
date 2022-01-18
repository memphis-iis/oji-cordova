Template.profile.helpers({
    'assignment': function(){
        assigned = Meteor.user().assigned;
        assignments = [];
        for(i = 0; i < assigned.length; i++){
            assessment = Assessments.findOne({_id: assigned[i]});
            assignments.push(assessment);
        }
        if(assignments.length == 0){
            assignments = false;
        }
        console.log(assignments);
        return assignments;
    }
})

Template.profile.events({
    'click #startAssessment': function(){
        assignment = $(event.target).data("assessment-id");
        target = "assessment/" + assignment
        Router.go(target);
    },
})


Template.profile.onCreated(function() {
    Meteor.subscribe('assessments');
})