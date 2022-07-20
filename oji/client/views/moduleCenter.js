Template.moduleCenter.helpers({
    'modules': function(){
        mod = Modules.find({}).fetch()
        return mod;
    }
})
Template.moduleCenter.events({
    'click .startModule': function(event){
        event.preventDefault();
        target = "/module/" + event.currentTarget.id;
        Meteor.call('setCurrentAssignment', {id: event.currentTarget.id, type: "module"}, function(err, res){
            if(err){
                console.log(err);
            } else {
                Router.go(target);
            }
        });
    },
})
Template.moduleCenter.onCreated(function() {
    Meteor.subscribe('modules');
})