Template.relaxationTechniques.helpers({
    selectedTechnique: function() {
        return Template.instance().selectedTechnique.get();
    }
})

Template.relaxationTechniques.onCreated(function() {
    this.selectedTechnique = new ReactiveVar(false);
})

Template.relaxationTechniques.events({
    'click #backToTechniques': function() {
        Template.instance().selectedTechnique.set(false);
    }
});

Template.relaxationTechniqueMenu.helpers({
   'relaxationTechniques': function() {
    relaxationTechniques = [
        {
            id: 1,
            title: 'Deep Breathing',
        },
        {
            id: 2,
            title: 'Progressive Muscle Relaxation',
        },
        {
            id: 3,
            title: 'Guided Imagery',
        },
        {
            id: 4,
            title: 'Positive Self-Talk',
        },
    ];
    console.log(relaxationTechniques);
     return relaxationTechniques;
   }
})

Template.relaxationTechniqueMenu.events({
    'click .select-tech': function(event) {
        techniqueId = $(event.target).attr('data-technique-id');
        techiqueTemplate = "rt" + techniqueId;
        console.log(techiqueTemplate);
        var parentView = Blaze.currentView.parentView.parentView;
        var parentInstance = parentView.templateInstance();
        parentInstance.selectedTechnique.set(techiqueTemplate);
    }
})

Template.rt0.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            situation: $('#question1').val(),
            activity: $('#question2').val(),
            duration: $('#question3').val(),
            resultInRelaxation: $('#question4').val()
        }
        Meteor.call('addExercise', exerciseObj, function(error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
            }
        });
    }
})

Template.rt1.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            situation: $('#question1').val(),
            activity: $('#question2').val(),
            duration: $('#question3').val(),
            resultInRelaxation: $('#question4').val()
        }
        Meteor.call('addExercise', exerciseObj, function(error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
            }
        });
    }
})
Template.rt2.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            situation: $('#question1').val(),
            activity: $('#question2').val(),
            duration: $('#question3').val(),
            resultInRelaxation: $('#question4').val()
        }
        Meteor.call('addExercise', exerciseObj, function(error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
            }
        });
    }
})
Template.rt3.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            situation: $('#question1').val(),
            activity: $('#question2').val(),
            duration: $('#question3').val(),
            resultInRelaxation: $('#question4').val()
        }
        Meteor.call('addExercise', exerciseObj, function(error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
            }
        });
    }
})