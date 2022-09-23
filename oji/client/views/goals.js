Template.goals.helpers({
    'goals': function(){
       // return user goals
       goals = Meteor.user().goals;
       // combine array of goals into a single array
       goals = goals.reduce((a, b) => a.concat(b), []);
         // return array of goals
         return goals;
    },
})

Template.goals.events({
    'click .deleteGoal': function(event){
        event.preventDefault();
        let goalId = $(event.target).attr('data-index');
        Meteor.call('deleteGoal', goalId);
    },
    'click #goal_submit': function(event){
        event.preventDefault();
        let goal = $('#goal').val();
        Meteor.call('addGoal', goal);
        $('#goal').val('');
    }
    
})


Template.goals.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})