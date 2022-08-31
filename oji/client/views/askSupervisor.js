Template.askSupervisor.helpers({
})

Template.askSupervisor.events({
    'click #newMessage': function(event){
        event.preventDefault();
        supervisor = Meteor.user().supervisor;
        console.log(supervisor);
        Meteor.call('newMessage', $('#message').val(), supervisor, "Question", function(error, result){
            if(error){
                alert("There was an error sending the message");
            }else{
                alert("Message sent");
            }
        }
        );
    }
})

