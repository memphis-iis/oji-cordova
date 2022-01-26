import Chart from 'chart.js/auto'

Template.userAssessmentReport.helpers({
    'assessment': function() {
        const identifier = Router.current().params._identifier.toUpperCase()
        const curTrial = Trials.findOne({'userId': Meteor.userId(), 'identifier': identifier});
        const assessment = Assessments.findOne({"identifier": identifier});
        subscales = Object.keys(curTrial.subscaleTotals);
        let scales = [];
        for(let i = 0; i < subscales.length; i++){
            scales[i] = {
                'subscaleName': assessment.assessmentReportConstants.subscaleTitles[subscales[i]],
                'subscaleScore': curTrial.subscaleTotals[subscales[i]]
            }
        }
        console.log(scales)
        return scales;
    }, 
    'chart': function() {
        const identifier = Router.current().params._identifier.toUpperCase()
        const curTrial = Trials.findOne({'identifier': identifier});
        const assessment = Assessments.findOne({"identifier": identifier});
        if(assessment){
            const ctx = $('#trialReportChart');
            const data = {
                labels: Object.keys(curTrial.subscaleTotals),
                datasets: [{
                    data: Object.values(curTrial.subscaleTotals),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(255, 159, 64, 0.2)',
                        'rgba(255, 205, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(201, 203, 207, 0.2)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(255, 159, 64)',
                        'rgb(255, 205, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(54, 162, 235)',
                        'rgb(153, 102, 255)',
                        'rgb(201, 203, 207)'
                    ],
                    borderWidth: 1
                }]
            };
            const chart = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    maintainAspectRatio: false,
                    scales: {
                    y: {
                        beginAtZero: true
                    }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: assessment.assessmentReportConstants.chartTitle
                        },
                        legend: {
                          display: false
                        }
                    }
                },
            });
        }
    },
    'tooltips': function() {
        const identifier = Router.current().params._identifier.toUpperCase()
        const assessment = Assessments.findOne({"identifier": identifier});
        if(assessment){
            return assessment.assessmentReportConstants.resultParagraphs
        }
    }
});

Template.userAssessmentReport.onRendered(function() {
});

Template.userAssessmentReport.onCreated(function() {
    Meteor.subscribe('usertrials');
    Meteor.subscribe('assessments');
});