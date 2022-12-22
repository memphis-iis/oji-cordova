Template.awards.helpers({
    'certificates': function(){
        return Meteor.user().certificates;
    },
});