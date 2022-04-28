Template.journal.helpers({
    'entries': () => Journals.find({}),
});

Template.journal.events({
    'click #createEntry': function(event){
        event.preventDefault();
        var text= $('#text').val();
        Meteor.call('addEntry',text);
    }
});
Template.journal.onCreated(function() {


})

