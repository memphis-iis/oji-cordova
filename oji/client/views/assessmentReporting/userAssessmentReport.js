import Chart from 'chart.js/auto'
const identifier = 'CCSM';

Template.userAssessmentReport.helpers({
    'assessment': function() {
        const curTrial = Trials.findOne({'userId': Meteor.userId(), 'identifier': identifier});
        const assessment = Assessments.findOne({"identifier": identifier});
        subscales = Object.keys(curTrial.subscaleTotals);
        let scales = [];
        for(let i = 0; i < subscales.length; i++){
            scales[i] = {
                'subscaleName': assessment.subscaleTitles[subscales[i]],
                'subscaleScore': curTrial.subscaleTotals[subscales[i]]
            }
        }
        console.log(scales)
        return scales;
    }
});

Template.userAssessmentReport.onRendered(function() {
    const curTrial = Trials.find({'identifier': identifier}).fetch();
    console.log(curTrial)
    const assessment = Assessments.findOne({"identifier": identifier});
    const ctx = $('#trialReportChart');
    const data = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        datasets: [{
        label: 'curTrial[0].chartTitle',
        data: [65, 59, 80, 81, 56, 55, 40],
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
            scales: {
            y: {
                beginAtZero: true
            }
            }
        },
    });
});

Template.userAssessmentReport.onCreated(function() {
    this.autorun(() => {
        this.subscribe('usertrials');
        this.subscribe('assessments');
    })
});