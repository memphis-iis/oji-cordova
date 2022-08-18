Template.goals.helpers({
    'goals': function(){
        user = Meteor.user();
        if(user){
            return user.profile.goals;
        }
    }
})

Template.goals.events({
    
})


Template.goals.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})