import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';

Template.relaxationTechniques.helpers({
    selectedTechnique: function() {
        return Template.instance().selectedTechnique.get();
    },
    selectedExercise: function() {
        return Template.instance().viewExercise.get();
    },
    todaysExercises: function() {
        //get todays month, day, and year
        var today = new Date();
        var month = today.getMonth();
        var day = today.getDate();
        var year = today.getFullYear();
        //get the exercises for today
        console.log("getting exercises for today")
        var exercises = Exercises.find({user: Meteor.userId(), month: month, day: day, year: year}).fetch();
        //log to console
        console.log(exercises);
        return exercises;
    },
    completedExercises: function() {
        exercisesToday = Exercises.find({user: Meteor.userId()}).fetch();
        console.log("completed exercises: " + exercisesToday);
        return exercisesToday;
    }
});
Template.relaxationTechniques.onCreated(function() {
    this.selectedTechnique = new ReactiveVar(false);
    this.viewExercise = new ReactiveVar(false);
})

Template.relaxationTechniques.events({
    'click #backToTechniques': function() {
        Template.instance().selectedTechnique.set(false);
    },
    'click #select-exercise': function(event) {
        var exerciseId = $(event.target).attr('data-exercise-id');
        var exercise = Exercises.findOne({_id: exerciseId});
        Template.instance().viewExercise.set(exercise);
    },
    'change #completed-exercises-select': function(event) {
        var exerciseId = $(event.target).val();
        var exercise = Exercises.findOne({_id: exerciseId});
        //set reactive variable to exercise
        Template.instance().viewExercise.set(exercise);
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
            title: "Deep Breathing",
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
    },
    'click #transcript': function(event) {
        //show transcript class div
        $('.transcript').show();
    }
})

Template.rt1.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            title: "Progressive Muscle Relaxation",
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
    },
    'click #transcript': function(event) {
        //show transcript class div
        $('.transcript').show();
    }
})
Template.rt2.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            title: "Guided Imagery",
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
    },
    'click #transcript': function(event) {
        //show transcript class div
        $('.transcript').show();
    }
})
Template.rt3.events({
    'click #submitExercise': function(event) {
        exerciseObj = {
            title: 'Positive Self-Talk',
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
    },
    'click #transcript': function(event) {
        //show transcript class div
        $('.transcript').show();
    }
})